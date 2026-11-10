import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory Firestore store for testing real concurrency, deterministic IDs & transactions
let store = {}

const makeRef = (colPath, id) => ({
  id,
  path: `${colPath}/${id}`,
  __col: colPath
})

const makeSnap = (ref, data) => ({
  id: ref.id,
  ref,
  exists: () => data !== undefined,
  data: () => (data !== undefined ? { ...data } : undefined)
})

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, name) => ({ __col: name })),
    doc: vi.fn((_db, colName, id) => makeRef(colName, id)),
    query: vi.fn((colRef, ...constraints) => ({ colRef, constraints })),
    where: vi.fn((field, op, value) => ({ type: 'where', field, op, value })),
    limit: vi.fn((n) => ({ type: 'limit', n })),
    getDoc: vi.fn(async (ref) => makeSnap(ref, store[ref.path])),
    getDocs: vi.fn(async (q) => {
      const colPrefix = `${q.colRef.__col}/`
      const wheres = (q.constraints || []).filter((c) => c.type === 'where')
      const limitObj = (q.constraints || []).find((c) => c.type === 'limit')

      let matches = Object.entries(store)
        .filter(([path]) => path.startsWith(colPrefix))
        .filter(([, data]) =>
          wheres.every((w) => {
            if (w.op === '==') return data[w.field] === w.value
            return false
          })
        )
        .map(([path, data]) => {
          const id = path.slice(colPrefix.length)
          return makeSnap(makeRef(q.colRef.__col, id), data)
        })

      if (limitObj) {
        matches = matches.slice(0, limitObj.n)
      }

      return {
        empty: matches.length === 0,
        docs: matches
      }
    }),
    addDoc: vi.fn(async (colRef, data) => {
      const id = `auto_${Math.random().toString(36).slice(2, 10)}`
      const ref = makeRef(colRef.__col, id)
      store[ref.path] = { ...data }
      return ref
    }),
    runTransaction: vi.fn(async (_db, callback) => {
      const stagedWrites = []
      const tx = {
        get: async (ref) => makeSnap(ref, store[ref.path]),
        set: (ref, data) => stagedWrites.push({ op: 'set', ref, data: { ...data } }),
        update: (ref, data) => stagedWrites.push({ op: 'update', ref, data: { ...data } }),
        delete: (ref) => stagedWrites.push({ op: 'delete', ref })
      }
      const result = await callback(tx)
      stagedWrites.forEach(({ op, ref, data }) => {
        if (op === 'set') {
          store[ref.path] = { ...data }
        } else if (op === 'update') {
          store[ref.path] = { ...(store[ref.path] || {}), ...data }
        } else if (op === 'delete') {
          delete store[ref.path]
        }
      })
      return result
    }),
    writeBatch: vi.fn(() => {
      const ops = []
      return {
        set: (ref, data) => ops.push({ op: 'set', ref, data: { ...data } }),
        update: (ref, data) => ops.push({ op: 'update', ref, data: { ...data } }),
        delete: (ref) => ops.push({ op: 'delete', ref }),
        commit: async () => {
          ops.forEach(({ op, ref, data }) => {
            if (op === 'set') store[ref.path] = { ...data }
            else if (op === 'update') store[ref.path] = { ...(store[ref.path] || {}), ...data }
            else if (op === 'delete') delete store[ref.path]
          })
        }
      }
    })
  }
})

import { runTransaction } from 'firebase/firestore'
import {
  saveReadingLog,
  deleteReadingLog,
  addBookIfMissing,
  finishBookTransaction,
  saveHatimCountTransaction,
  addMemberToGroup,
  removeMemberFromGroup,
  moveMemberBetweenGroups
} from './readingService'

describe('readingService - Transactional & Race-Condition Safe Operations', () => {
  const mockDb = {}
  const uid = 'user-123'
  const book = { id: 'book-sualar', title: 'Şualar', last_reset: null }

  beforeEach(() => {
    store = {
      'books/book-sualar': {
        user_id: uid,
        title: 'Şualar',
        current_pages: 100,
        added_at: '2026-10-31T00:00:00.000Z'
      }
    }
    vi.clearAllMocks()
  })

  describe('saveReadingLog', () => {
    it('creates a deterministic reading log and updates book current_pages atomically', async () => {
      const res = await saveReadingLog(mockDb, {
        uid,
        book,
        amount: 37,
        dateInput: '2026-11-10'
      })

      expect(res).toEqual({ logId: 'user-123_book-sualar_2026-11-10', amount: 37 })
      expect(store['reading_logs/user-123_book-sualar_2026-11-10']).toMatchObject({
        user_id: uid,
        book_id: 'book-sualar',
        title: 'Şualar',
        amount: 37,
        date: '2026-11-10'
      })
      expect(store['books/book-sualar'].current_pages).toBe(137)
    })

    it('never creates duplicate docs when invoked sequentially/concurrently for the same day', async () => {
      // Simulate two overlapping calls saving 37 pages on the exact same day
      await Promise.all([
        saveReadingLog(mockDb, { uid, book, amount: 37, dateInput: '2026-11-10' }),
        saveReadingLog(mockDb, { uid, book, amount: 37, dateInput: '2026-11-10' })
      ])

      const matchingLogs = Object.entries(store).filter(
        ([path]) => path.startsWith('reading_logs/')
      )
      expect(matchingLogs).toHaveLength(1)
      expect(matchingLogs[0][1].amount).toBe(37)
      expect(store['books/book-sualar'].current_pages).toBe(137)
    })

    it('updates existing log preserving created_at and consolidates legacy duplicates', async () => {
      // Seed two legacy random-ID duplicate logs for the same day
      store['reading_logs/legacy1'] = {
        user_id: uid,
        book_id: 'book-sualar',
        title: 'Şualar',
        amount: 37,
        date: '2026-11-10',
        created_at: '2026-11-10T10:00:00.000Z'
      }
      store['reading_logs/legacy2'] = {
        user_id: uid,
        book_id: 'book-sualar',
        title: 'Şualar',
        amount: 32,
        date: '2026-11-10',
        created_at: '2026-11-10T10:00:00.001Z'
      }
      store['books/book-sualar'].current_pages = 169 // 100 + 37 + 32

      await saveReadingLog(mockDb, {
        uid,
        book,
        amount: 37,
        dateInput: '2026-11-10'
      })

      expect(store['reading_logs/legacy1']).toBeUndefined()
      expect(store['reading_logs/legacy2']).toBeUndefined()
      expect(store['reading_logs/user-123_book-sualar_2026-11-10']).toMatchObject({
        amount: 37,
        created_at: '2026-11-10T10:00:00.000Z'
      })
      expect(store['books/book-sualar'].current_pages).toBe(137)
    })

    it('falls back to atomic writeBatch when transaction reports offline/unavailable', async () => {
      runTransaction.mockRejectedValueOnce({ code: 'unavailable', message: 'client is offline' })

      await saveReadingLog(mockDb, {
        uid,
        book,
        amount: 20,
        dateInput: '2026-11-10'
      })

      expect(store['reading_logs/user-123_book-sualar_2026-11-10'].amount).toBe(20)
      expect(store['books/book-sualar'].current_pages).toBe(120)
    })
  })

  describe('deleteReadingLog', () => {
    it('deletes the log and subtracts amount from book.current_pages cleanly', async () => {
      store['reading_logs/log-1'] = {
        user_id: uid,
        book_id: 'book-sualar',
        title: 'Şualar',
        amount: 37,
        date: '2026-11-10',
        created_at: '2026-11-10T12:00:00.000Z'
      }
      store['books/book-sualar'].current_pages = 137

      const deleted = await deleteReadingLog(mockDb, {
        id: 'log-1',
        book_id: 'book-sualar',
        amount: 37,
        date: '2026-11-10'
      })

      expect(deleted).toBe(true)
      expect(store['reading_logs/log-1']).toBeUndefined()
      expect(store['books/book-sualar'].current_pages).toBe(100)

      // Deleting the same log again is a safe idempotent no-op
      const secondTry = await deleteReadingLog(mockDb, {
        id: 'log-1',
        book_id: 'book-sualar',
        amount: 37,
        date: '2026-11-10'
      })
      expect(secondTry).toBe(false)
      expect(store['books/book-sualar'].current_pages).toBe(100)
    })

    it('does not decrement book.current_pages when deleting an old log before last_reset', async () => {
      store['books/book-sualar'].last_reset = '2026-11-05T10:00:00.000Z'
      store['books/book-sualar'].current_pages = 25
      store['reading_logs/old-log'] = {
        user_id: uid,
        book_id: 'book-sualar',
        title: 'Şualar',
        amount: 50,
        date: '2026-11-01',
        created_at: '2026-11-01T10:00:00.000Z'
      }

      await deleteReadingLog(mockDb, {
        id: 'old-log',
        book_id: 'book-sualar',
        amount: 50,
        date: '2026-11-01'
      })

      expect(store['reading_logs/old-log']).toBeUndefined()
      expect(store['books/book-sualar'].current_pages).toBe(25)
    })
  })

  describe('finishBookTransaction & saveHatimCountTransaction & addBookIfMissing', () => {
    it('atomically increments book_stats and resets book progress', async () => {
      await finishBookTransaction(mockDb, { uid, book })

      expect(store['books/book-sualar'].current_pages).toBe(0)
      expect(store['books/book-sualar'].last_reset).toBeTruthy()
      expect(store['book_stats/user-123_%C5%9Eualar']).toEqual({
        user_id: uid,
        book_title: 'Şualar',
        count: 1
      })

      await finishBookTransaction(mockDb, { uid, book })
      expect(store['book_stats/user-123_%C5%9Eualar'].count).toBe(2)
    })

    it('sets hatim count and prevents duplicate books', async () => {
      await saveHatimCountTransaction(mockDb, { uid, bookTitle: 'Şualar', count: 5 })
      expect(store['book_stats/user-123_%C5%9Eualar'].count).toBe(5)

      const duplicateRes = await addBookIfMissing(mockDb, { uid, title: 'Şualar' })
      expect(duplicateRes).toEqual({ added: false, reason: 'duplicate' })

      const newRes = await addBookIfMissing(mockDb, { uid, title: 'Sözler' })
      expect(newRes.added).toBe(true)
    })
  })

  describe('group member atomic transactions', () => {
    beforeEach(() => {
      store['following_groups/g1'] = { user_id: uid, name: 'Grup 1', members: [] }
      store['following_groups/g2'] = { user_id: uid, name: 'Grup 2', members: [] }
    })

    it('adds, prevents duplicates, moves atomically, and removes group members', async () => {
      const m1 = { id: 'f1', name: 'Ali', public_id: 'TR1111X2222' }

      const add1 = await addMemberToGroup(mockDb, { groupId: 'g1', member: m1 })
      expect(add1).toEqual({ added: true })
      expect(store['following_groups/g1'].members).toEqual([m1])

      const addDup = await addMemberToGroup(mockDb, { groupId: 'g1', member: m1 })
      expect(addDup).toEqual({ added: false, reason: 'already_exists' })
      expect(store['following_groups/g1'].members).toHaveLength(1)

      await moveMemberBetweenGroups(mockDb, {
        sourceGroupId: 'g1',
        targetGroupId: 'g2',
        member: m1
      })
      expect(store['following_groups/g1'].members).toEqual([])
      expect(store['following_groups/g2'].members).toEqual([m1])

      await removeMemberFromGroup(mockDb, { groupId: 'g2', memberId: 'f1' })
      expect(store['following_groups/g2'].members).toEqual([])
    })
  })
})
