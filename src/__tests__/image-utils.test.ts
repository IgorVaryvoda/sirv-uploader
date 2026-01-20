import { describe, it, expect } from 'vitest'
import {
  isImageFile,
  isHeifFile,
  validateFileSize,
  generateId,
  isValidUrl,
  formatFileSize,
  getFileExtension,
  getMimeType,
  DEFAULT_MAX_FILE_SIZE,
} from '../utils/image-utils'

describe('image-utils', () => {
  describe('isImageFile', () => {
    it('should return true for image mime types', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      expect(isImageFile(file)).toBe(true)
    })

    it('should return true for image extensions', () => {
      const file = new File([''], 'test.png', { type: '' })
      expect(isImageFile(file)).toBe(true)
    })

    it('should return false for non-image files', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' })
      expect(isImageFile(file)).toBe(false)
    })

    it('should handle various image extensions', () => {
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'avif']
      extensions.forEach((ext) => {
        const file = new File([''], `test.${ext}`, { type: '' })
        expect(isImageFile(file)).toBe(true)
      })
    })
  })

  describe('isHeifFile', () => {
    it('should return true for HEIC files', () => {
      const file = new File([''], 'photo.heic', { type: 'image/heic' })
      expect(isHeifFile(file)).toBe(true)
    })

    it('should return true for HEIF files', () => {
      const file = new File([''], 'photo.heif', { type: 'image/heif' })
      expect(isHeifFile(file)).toBe(true)
    })

    it('should detect by extension when mime type is missing', () => {
      const file = new File([''], 'photo.HEIC', { type: '' })
      expect(isHeifFile(file)).toBe(true)
    })

    it('should return false for non-HEIF files', () => {
      const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
      expect(isHeifFile(file)).toBe(false)
    })
  })

  describe('validateFileSize', () => {
    it('should return valid for files under the limit', () => {
      const file = new File(['x'.repeat(1000)], 'small.jpg')
      const result = validateFileSize(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return invalid for files over the default limit', () => {
      const file = new File(['x'.repeat(DEFAULT_MAX_FILE_SIZE + 1)], 'large.jpg')
      const result = validateFileSize(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('should respect custom max size', () => {
      const file = new File(['x'.repeat(1000)], 'test.jpg')
      const result = validateFileSize(file, 500)
      expect(result.valid).toBe(false)
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('should generate IDs with timestamp prefix', () => {
      const before = Date.now()
      const id = generateId()
      const after = Date.now()
      const timestamp = parseInt(id.split('-')[0])
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('should generate IDs with hex suffix', () => {
      const id = generateId()
      const suffix = id.split('-')[1]
      expect(suffix).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(isValidUrl('https://example.com/image.jpg')).toBe(true)
      expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('should return true for URLs with query params', () => {
      expect(isValidUrl('https://example.com/image.jpg?w=100')).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl(null)).toBe(false)
      expect(isValidUrl(undefined)).toBe(false)
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1500)).toBe('1.5 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1500000)).toBe('1.4 MB')
    })
  })

  describe('getFileExtension', () => {
    it('should extract extension', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg')
      expect(getFileExtension('photo.JPEG')).toBe('jpeg')
    })

    it('should handle multiple dots', () => {
      expect(getFileExtension('my.photo.png')).toBe('png')
    })

    it('should return empty string for no extension', () => {
      expect(getFileExtension('noextension')).toBe('')
    })
  })

  describe('getMimeType', () => {
    it('should return file.type if present', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      expect(getMimeType(file)).toBe('image/jpeg')
    })

    it('should infer mime type from extension', () => {
      const file = new File([''], 'test.png', { type: '' })
      expect(getMimeType(file)).toBe('image/png')
    })

    it('should return octet-stream for unknown extensions', () => {
      const file = new File([''], 'test.xyz', { type: '' })
      expect(getMimeType(file)).toBe('application/octet-stream')
    })
  })
})
