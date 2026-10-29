import { describe, it, expect } from 'vitest'
import {
  getTodayStr,
  validatePagesInput,
  validateName,
  validatePassword,
  generatePublicId
} from './helpers'

describe('helpers.js - Utility Functions', () => {
  describe('getTodayStr', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const today = getTodayStr()
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(today).toBe(new Date().toISOString().split('T')[0])
    })
  })

  describe('validatePagesInput', () => {
    it('should accept valid page numbers', () => {
      expect(validatePagesInput(1)).toEqual({ valid: true, value: 1 })
      expect(validatePagesInput('25')).toEqual({ valid: true, value: 25 })
      expect(validatePagesInput(1000)).toEqual({ valid: true, value: 1000 })
    })

    it('should reject numbers below 1', () => {
      const zero = validatePagesInput(0)
      expect(zero.valid).toBe(false)
      expect(zero.error).toBe('En az 1 sayfa girmelisiniz')

      const negative = validatePagesInput(-10)
      expect(negative.valid).toBe(false)
      expect(negative.error).toBe('En az 1 sayfa girmelisiniz')
    })

    it('should reject numbers above 1000', () => {
      const overLimit = validatePagesInput(1001)
      expect(overLimit.valid).toBe(false)
      expect(overLimit.error).toBe('Günlük maksimum 1000 sayfa girebilirsiniz')
    })

    it('should reject non-numeric inputs', () => {
      const nanResult = validatePagesInput('abc')
      expect(nanResult.valid).toBe(false)
      expect(nanResult.error).toBe('Geçerli bir sayfa sayısı giriniz')

      const emptyResult = validatePagesInput('')
      expect(emptyResult.valid).toBe(false)
    })
  })

  describe('validateName', () => {
    it('should accept valid names including Turkish characters', () => {
      expect(validateName('Ali')).toEqual({ valid: true })
      expect(validateName('Ahmet Faruk')).toEqual({ valid: true })
      expect(validateName('Şükrü Çetin Özkan')).toEqual({ valid: true })
    })

    it('should reject empty or whitespace-only names', () => {
      expect(validateName('')).toEqual({ valid: false, error: 'İsim gereklidir' })
      expect(validateName('   ')).toEqual({ valid: false, error: 'İsim gereklidir' })
      expect(validateName(null)).toEqual({ valid: false, error: 'İsim gereklidir' })
      expect(validateName(undefined)).toEqual({ valid: false, error: 'İsim gereklidir' })
    })

    it('should reject names longer than 100 characters', () => {
      const longName = 'a'.repeat(101)
      expect(validateName(longName)).toEqual({ valid: false, error: 'İsim 100 karakterden uzun olamaz' })
    })

    it('should reject HTML tags to prevent XSS', () => {
      expect(validateName('<script>alert("xss")</script>')).toEqual({
        valid: false,
        error: 'Geçersiz karakterler'
      })
      expect(validateName('Ahmet <img src=x onerror=alert(1)>')).toEqual({
        valid: false,
        error: 'Geçersiz karakterler'
      })
    })
  })

  describe('validatePassword', () => {
    it('should accept passwords with 8 or more characters', () => {
      expect(validatePassword('12345678')).toEqual({ valid: true })
      expect(validatePassword('StrongPassword!2026')).toEqual({ valid: true })
    })

    it('should reject passwords shorter than 8 characters', () => {
      expect(validatePassword('1234567')).toEqual({ valid: false, error: 'Şifre en az 8 karakter olmalı' })
      expect(validatePassword('')).toEqual({ valid: false, error: 'Şifre en az 8 karakter olmalı' })
    })
  })

  describe('generatePublicId', () => {
    it('should generate ID in TR####X#### format', () => {
      const id = generatePublicId()
      expect(id).toMatch(/^TR\d{4}X\d{4}$/)
    })

    it('should generate distinct IDs across multiple calls', () => {
      const id1 = generatePublicId()
      const id2 = generatePublicId()
      const id3 = generatePublicId()
      const set = new Set([id1, id2, id3])
      expect(set.size).toBe(3)
    })
  })
})

