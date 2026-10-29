import { describe, it, expect } from 'vitest'
import { RISALE_BOOKS, COLORS } from './constants'

describe('constants.js - Risale-i Nur Külliyatı and Palette', () => {
  it('should define exactly 14 books in the collection', () => {
    expect(RISALE_BOOKS).toHaveLength(14)
  })

  it('should contain all required canonical books without duplicates', () => {
    const requiredBooks = [
      'Sözler',
      'Mektubat',
      'Lemalar',
      'Şualar',
      'Asa-yı Musa',
      'Barla Lahikası',
      'Kastamonu Lahikası',
      'Emirdağ Lahikası',
      'Tarihçe-i Hayat',
      "İşaratü'l İ'caz",
      'Mesnevi-i Nuriye',
      'Sikke-i Tasdik-i Gaybi',
      'Muhakemat',
      'İman ve Küfür Muvazeneleri'
    ]

    expect(RISALE_BOOKS).toEqual(requiredBooks)
    const uniqueBooks = new Set(RISALE_BOOKS)
    expect(uniqueBooks.size).toBe(14)
  })

  it('should have valid hex colors defined in the palette', () => {
    expect(COLORS.length).toBeGreaterThan(0)
    COLORS.forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })
})

