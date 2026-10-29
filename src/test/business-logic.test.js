import { describe, it, expect } from 'vitest'
import { RISALE_BOOKS } from '../constants'

describe('Business Logic - Hatim and Reading Calculation Rules', () => {
  const calculateHatimStats = (finishedStats) => {
    const hatimCount = Math.min(...RISALE_BOOKS.map((title) => finishedStats[title] || 0))
    const booksTowardsNext = RISALE_BOOKS.filter((title) => (finishedStats[title] || 0) > hatimCount).length
    const progressPercent = Math.round((booksTowardsNext / 14) * 100)
    return { hatimCount, booksTowardsNext, progressPercent }
  }

  const calculateBookProgress = (book, logs) => {
    let total = 0
    Object.values(logs).flat().forEach((log) => {
      if (log.book_id === book.id) {
        let logTime = new Date(log.created_at).getTime()
        if (log.date) logTime = new Date(log.date).getTime()

        if (book.last_reset) {
          const resetTime = new Date(book.last_reset).getTime()
          if (logTime <= resetTime) return
        }
        total += log.amount
      }
    })
    return total
  }

  describe('Külliyat Hatmi Calculation', () => {
    it('should be 0 when user has not completed all 14 books', () => {
      const stats = {
        Sözler: 2,
        Mektubat: 1,
        Lemalar: 1
      }
      const { hatimCount, booksTowardsNext, progressPercent } = calculateHatimStats(stats)
      expect(hatimCount).toBe(0)
      expect(booksTowardsNext).toBe(3)
      expect(progressPercent).toBe(Math.round((3 / 14) * 100))
    })

    it('should calculate 1 full hatim when all 14 books have been finished at least once', () => {
      const stats = {}
      RISALE_BOOKS.forEach((title) => {
        stats[title] = 1
      })
      const { hatimCount, booksTowardsNext, progressPercent } = calculateHatimStats(stats)
      expect(hatimCount).toBe(1)
      expect(booksTowardsNext).toBe(0)
      expect(progressPercent).toBe(0)
    })

    it('should track progress towards the next hatim correctly', () => {
      const stats = {}
      RISALE_BOOKS.forEach((title, idx) => {
        // First 7 books completed twice, remaining completed once
        stats[title] = idx < 7 ? 2 : 1
      })
      const { hatimCount, booksTowardsNext, progressPercent } = calculateHatimStats(stats)
      expect(hatimCount).toBe(1)
      expect(booksTowardsNext).toBe(7)
      expect(progressPercent).toBe(50)
    })
  })

  describe('Book Progress Calculation (last_reset filter)', () => {
    it('should sum all logs for a book without a reset date', () => {
      const book = { id: 'book-1', title: 'Sözler', last_reset: null }
      const logs = {
        '2026-10-01': [{ book_id: 'book-1', amount: 20, date: '2026-10-01', created_at: '2026-10-01T10:00:00Z' }],
        '2026-10-02': [
          { book_id: 'book-1', amount: 15, date: '2026-10-02', created_at: '2026-10-02T10:00:00Z' },
          { book_id: 'other-book', amount: 30, date: '2026-10-02', created_at: '2026-10-02T10:00:00Z' }
        ]
      }

      const total = calculateBookProgress(book, logs)
      expect(total).toBe(35)
    })

    it('should ignore logs before last_reset when book has been reset/finished', () => {
      const book = {
        id: 'book-1',
        title: 'Sözler',
        last_reset: '2026-10-15T00:00:00Z'
      }
      const logs = {
        '2026-10-10': [{ book_id: 'book-1', amount: 50, date: '2026-10-10', created_at: '2026-10-10T12:00:00Z' }],
        '2026-10-20': [{ book_id: 'book-1', amount: 25, date: '2026-10-20', created_at: '2026-10-20T12:00:00Z' }]
      }

      const total = calculateBookProgress(book, logs)
      expect(total).toBe(25)
    })
  })
})

