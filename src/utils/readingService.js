import {
  collection,
  doc,
  query,
  where,
  limit,
  getDoc,
  getDocs,
  addDoc,
  runTransaction,
  writeBatch
} from 'firebase/firestore'
import {
  getReadingLogDocId,
  getBookStatDocId,
  isLogAfterReset
} from './helpers'

/**
 * Executes an atomic read-modify-write unit of work via Firestore runTransaction,
 * falling back to writeBatch when the client is offline (PWA support).
 */
export const executeAtomic = async (db, workFn) => {
  const runInBatch = async () => {
    const batch = writeBatch(db)
    let hasWrites = false
    const result = await workFn({
      get: (ref) => getDoc(ref),
      set: (ref, data) => {
        hasWrites = true
        batch.set(ref, data)
      },
      update: (ref, data) => {
        hasWrites = true
        batch.update(ref, data)
      },
      delete: (ref) => {
        hasWrites = true
        batch.delete(ref)
      }
    })
    if (hasWrites) {
      await batch.commit()
    }
    return result
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return runInBatch()
  }

  try {
    return await runTransaction(db, (transaction) => workFn(transaction))
  } catch (err) {
    if (err?.code === 'unavailable' || err?.message?.toLowerCase().includes('offline')) {
      return runInBatch()
    }
    throw err
  }
}

/**
 * Atomically creates or updates the single deterministic reading log for (uid, book.id, dateInput),
 * consolidating any legacy random-ID duplicate logs for the same day and updating book.current_pages.
 */
export const saveReadingLog = async (db, { uid, book, amount, dateInput }) => {
  const detLogId = getReadingLogDocId(uid, book.id, dateInput)
  const detLogRef = doc(db, 'reading_logs', detLogId)
  const bookRef = doc(db, 'books', book.id)

  const existingQuery = query(
    collection(db, 'reading_logs'),
    where('user_id', '==', uid),
    where('book_id', '==', book.id),
    where('date', '==', dateInput)
  )
  const existingSnap = await getDocs(existingQuery)
  const legacyRefs = existingSnap.docs
    .map((docItem) => docItem.ref)
    .filter((ref) => ref.id !== detLogId)

  return executeAtomic(db, async (op) => {
    const [bookSnap, detSnap, ...legacySnaps] = await Promise.all([
      op.get(bookRef),
      op.get(detLogRef),
      ...legacyRefs.map((ref) => op.get(ref))
    ])

    const lastReset = bookSnap.exists() ? bookSnap.data().last_reset : book.last_reset
    let previousCountedAmount = 0
    let preservedCreatedAt = null

    if (detSnap.exists()) {
      const detData = detSnap.data()
      preservedCreatedAt = detData.created_at || null
      if (isLogAfterReset(detData, lastReset)) {
        previousCountedAmount += detData.amount || 0
      }
    }

    const validLegacySnaps = legacySnaps.filter((snap) => snap.exists())
    validLegacySnaps.forEach((snap) => {
      const data = snap.data()
      if (!preservedCreatedAt && data.created_at) {
        preservedCreatedAt = data.created_at
      }
      if (isLogAfterReset(data, lastReset)) {
        previousCountedAmount += data.amount || 0
      }
    })

    const createdAt = preservedCreatedAt || new Date().toISOString()

    // Remove any legacy duplicate logs for the same book and date
    validLegacySnaps.forEach((snap) => {
      op.delete(snap.ref)
    })

    if (detSnap.exists()) {
      op.update(detLogRef, { amount })
    } else {
      op.set(detLogRef, {
        user_id: uid,
        book_id: book.id,
        title: book.title,
        amount,
        date: dateInput,
        created_at: createdAt
      })
    }

    if (bookSnap.exists()) {
      const currentPages = bookSnap.data().current_pages || 0
      const newCountedAmount = isLogAfterReset({ date: dateInput, created_at: createdAt }, lastReset)
        ? amount
        : 0
      const diff = newCountedAmount - previousCountedAmount
      const nextPages = Math.min(1000000, Math.max(0, currentPages + diff))
      op.update(bookRef, { current_pages: nextPages })
    }

    return { logId: detLogId, amount }
  })
}

/**
 * Atomically deletes a reading log and decrements book.current_pages if counted in current cycle.
 * Idempotent if the document has already been deleted.
 */
export const deleteReadingLog = async (db, log) => {
  if (!log?.id) return false

  const logRef = doc(db, 'reading_logs', log.id)
  const bookRef = log.book_id ? doc(db, 'books', log.book_id) : null

  return executeAtomic(db, async (op) => {
    const [logSnap, bookSnap] = await Promise.all([
      op.get(logRef),
      bookRef ? op.get(bookRef) : Promise.resolve(null)
    ])

    if (!logSnap.exists()) return false

    const logData = logSnap.data()
    if (bookSnap && bookSnap.exists()) {
      const bookData = bookSnap.data()
      if (isLogAfterReset(logData, bookData.last_reset)) {
        const currentPages = bookData.current_pages || 0
        const nextPages = Math.max(0, currentPages - (logData.amount || 0))
        op.update(bookRef, { current_pages: nextPages })
      }
    }

    op.delete(logRef)
    return true
  })
}

/**
 * Adds a book if it doesn't already exist for this user in Firestore.
 */
export const addBookIfMissing = async (db, { uid, title }) => {
  const existingQuery = query(
    collection(db, 'books'),
    where('user_id', '==', uid),
    where('title', '==', title),
    limit(1)
  )
  const existingSnap = await getDocs(existingQuery)
  if (!existingSnap.empty) {
    return { added: false, reason: 'duplicate' }
  }

  const docRef = await addDoc(collection(db, 'books'), {
    user_id: uid,
    title,
    current_pages: 0,
    added_at: new Date().toISOString()
  })
  return { added: true, id: docRef.id }
}

/**
 * Atomically increments hatim count for a book and resets its current_pages & last_reset.
 */
export const finishBookTransaction = async (db, { uid, book }) => {
  const detStatId = getBookStatDocId(uid, book.title)
  const detStatRef = doc(db, 'book_stats', detStatId)
  const bookRef = doc(db, 'books', book.id)

  const statsQuery = query(
    collection(db, 'book_stats'),
    where('user_id', '==', uid),
    where('book_title', '==', book.title)
  )
  const statsSnap = await getDocs(statsQuery)
  const legacyStatRefs = statsSnap.docs
    .map((docItem) => docItem.ref)
    .filter((ref) => ref.id !== detStatId)

  return executeAtomic(db, async (op) => {
    const [bookSnap, detStatSnap, ...legacyStatSnaps] = await Promise.all([
      op.get(bookRef),
      op.get(detStatRef),
      ...legacyStatRefs.map((ref) => op.get(ref))
    ])

    if (!bookSnap.exists()) return false

    const validLegacySnaps = legacyStatSnaps.filter((snap) => snap.exists())
    const targetSnap = detStatSnap.exists() ? detStatSnap : (validLegacySnaps[0] || null)

    if (targetSnap) {
      const nextCount = Math.min(100000, (targetSnap.data().count || 0) + 1)
      validLegacySnaps.forEach((snap) => {
        if (snap.ref.id !== targetSnap.ref.id) {
          op.delete(snap.ref)
        }
      })
      op.update(targetSnap.ref, { count: nextCount })
    } else {
      op.set(detStatRef, {
        user_id: uid,
        book_title: book.title,
        count: 1
      })
    }

    op.update(bookRef, {
      current_pages: 0,
      last_reset: new Date().toISOString()
    })

    return true
  })
}

/**
 * Atomically sets the hatim count for a book, deduplicating any legacy stat docs.
 */
export const saveHatimCountTransaction = async (db, { uid, bookTitle, count }) => {
  const detStatId = getBookStatDocId(uid, bookTitle)
  const detStatRef = doc(db, 'book_stats', detStatId)

  const statsQuery = query(
    collection(db, 'book_stats'),
    where('user_id', '==', uid),
    where('book_title', '==', bookTitle)
  )
  const statsSnap = await getDocs(statsQuery)
  const legacyStatRefs = statsSnap.docs
    .map((docItem) => docItem.ref)
    .filter((ref) => ref.id !== detStatId)

  return executeAtomic(db, async (op) => {
    const [detStatSnap, ...legacyStatSnaps] = await Promise.all([
      op.get(detStatRef),
      ...legacyStatRefs.map((ref) => op.get(ref))
    ])

    const validLegacySnaps = legacyStatSnaps.filter((snap) => snap.exists())
    const targetSnap = detStatSnap.exists() ? detStatSnap : (validLegacySnaps[0] || null)

    if (targetSnap) {
      validLegacySnaps.forEach((snap) => {
        if (snap.ref.id !== targetSnap.ref.id) {
          op.delete(snap.ref)
        }
      })
      op.update(targetSnap.ref, { count })
    } else {
      op.set(detStatRef, {
        user_id: uid,
        book_title: bookTitle,
        count
      })
    }

    return true
  })
}

/**
 * Atomically adds a member to a following group inside a transaction.
 */
export const addMemberToGroup = async (db, { groupId, member }) => {
  const groupRef = doc(db, 'following_groups', groupId)

  return executeAtomic(db, async (op) => {
    const groupSnap = await op.get(groupRef)
    if (!groupSnap.exists()) {
      throw new Error('Grup bulunamadı.')
    }

    const currentMembers = groupSnap.data().members || []
    if (currentMembers.some((m) => m.id === member.id)) {
      return { added: false, reason: 'already_exists' }
    }
    if (currentMembers.length >= 100) {
      throw new Error('Bir grupta en fazla 100 üye bulunabilir.')
    }

    op.update(groupRef, { members: [...currentMembers, member] })
    return { added: true }
  })
}

/**
 * Atomically removes a member from a following group inside a transaction.
 */
export const removeMemberFromGroup = async (db, { groupId, memberId }) => {
  const groupRef = doc(db, 'following_groups', groupId)

  return executeAtomic(db, async (op) => {
    const groupSnap = await op.get(groupRef)
    if (!groupSnap.exists()) return false

    const currentMembers = groupSnap.data().members || []
    const nextMembers = currentMembers.filter((m) => m.id !== memberId)
    op.update(groupRef, { members: nextMembers })
    return true
  })
}

/**
 * Atomically moves a member between two following groups inside a single transaction.
 */
export const moveMemberBetweenGroups = async (db, { sourceGroupId, targetGroupId, member }) => {
  if (sourceGroupId === targetGroupId) return false

  const sourceRef = doc(db, 'following_groups', sourceGroupId)
  const targetRef = doc(db, 'following_groups', targetGroupId)

  return executeAtomic(db, async (op) => {
    const [sourceSnap, targetSnap] = await Promise.all([
      op.get(sourceRef),
      op.get(targetRef)
    ])

    if (!sourceSnap.exists() || !targetSnap.exists()) {
      throw new Error('Grup bulunamadı.')
    }

    const sourceMembers = (sourceSnap.data().members || []).filter((m) => m.id !== member.id)
    const targetMembers = targetSnap.data().members || []
    const updatedTargetMembers = targetMembers.some((m) => m.id === member.id)
      ? targetMembers
      : [...targetMembers, member]

    if (updatedTargetMembers.length > 100) {
      throw new Error('Hedef grupta en fazla 100 üye bulunabilir.')
    }

    op.update(sourceRef, { members: sourceMembers })
    op.update(targetRef, { members: updatedTargetMembers })
    return true
  })
}
