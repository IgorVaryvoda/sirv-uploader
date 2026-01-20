import { describe, it, expect } from 'vitest'
import {
  detectDelimiter,
  parseCsvRow,
  splitMultipleUrls,
  extractPathFromUrl,
  cellToString,
  getCsvHeaders,
  findColumnIndex,
  parseCsvClient,
  isSpreadsheetFile,
  defaultUrlValidator,
  sirvUrlValidator,
} from '../utils/csv-parser'

describe('csv-parser', () => {
  describe('detectDelimiter', () => {
    it('should detect comma delimiter', () => {
      const csv = 'name,url,size\ntest,http://example.com,100'
      expect(detectDelimiter(csv)).toBe(',')
    })

    it('should detect tab delimiter', () => {
      const csv = 'name\turl\tsize\ntest\thttp://example.com\t100'
      expect(detectDelimiter(csv)).toBe('\t')
    })

    it('should detect semicolon delimiter', () => {
      const csv = 'name;url;size\ntest;http://example.com;100'
      expect(detectDelimiter(csv)).toBe(';')
    })

    it('should detect pipe delimiter', () => {
      const csv = 'name|url|size\ntest|http://example.com|100'
      expect(detectDelimiter(csv)).toBe('|')
    })

    it('should default to comma for empty content', () => {
      expect(detectDelimiter('')).toBe(',')
    })
  })

  describe('parseCsvRow', () => {
    it('should parse simple row', () => {
      expect(parseCsvRow('a,b,c')).toEqual(['a', 'b', 'c'])
    })

    it('should handle quoted fields', () => {
      expect(parseCsvRow('"hello, world",test')).toEqual(['hello, world', 'test'])
    })

    it('should handle empty fields', () => {
      expect(parseCsvRow('a,,c')).toEqual(['a', '', 'c'])
    })

    it('should trim whitespace', () => {
      expect(parseCsvRow(' a , b , c ')).toEqual(['a', 'b', 'c'])
    })

    it('should use custom delimiter', () => {
      expect(parseCsvRow('a;b;c', ';')).toEqual(['a', 'b', 'c'])
    })
  })

  describe('splitMultipleUrls', () => {
    it('should split comma-separated URLs', () => {
      const result = splitMultipleUrls('http://a.com,http://b.com')
      expect(result).toEqual(['http://a.com', 'http://b.com'])
    })

    it('should filter non-URLs', () => {
      const result = splitMultipleUrls('http://a.com,not-a-url,http://b.com')
      expect(result).toEqual(['http://a.com', 'http://b.com'])
    })

    it('should handle empty string', () => {
      expect(splitMultipleUrls('')).toEqual([])
    })

    it('should trim whitespace', () => {
      const result = splitMultipleUrls(' http://a.com , http://b.com ')
      expect(result).toEqual(['http://a.com', 'http://b.com'])
    })
  })

  describe('extractPathFromUrl', () => {
    it('should extract pathname', () => {
      expect(extractPathFromUrl('https://example.com/path/to/file.jpg')).toBe('/path/to/file.jpg')
    })

    it('should return input for invalid URLs', () => {
      expect(extractPathFromUrl('not-a-url')).toBe('not-a-url')
    })
  })

  describe('cellToString', () => {
    it('should convert primitives', () => {
      expect(cellToString('hello')).toBe('hello')
      expect(cellToString(123)).toBe('123')
      expect(cellToString(true)).toBe('true')
    })

    it('should handle null/undefined', () => {
      expect(cellToString(null)).toBe('')
      expect(cellToString(undefined)).toBe('')
    })

    it('should handle rich text objects', () => {
      expect(cellToString({ text: 'hello' })).toBe('hello')
    })

    it('should handle formula results', () => {
      expect(cellToString({ result: 42 })).toBe('42')
    })
  })

  describe('getCsvHeaders', () => {
    it('should return first row as headers', () => {
      const csv = 'name,url,size\ntest,http://example.com,100'
      expect(getCsvHeaders(csv)).toEqual(['name', 'url', 'size'])
    })

    it('should handle empty content', () => {
      expect(getCsvHeaders('')).toEqual([''])
    })
  })

  describe('findColumnIndex', () => {
    it('should find column by name (case-insensitive)', () => {
      const headers = ['Name', 'URL', 'Size']
      expect(findColumnIndex(headers, 'url')).toBe(1)
      expect(findColumnIndex(headers, 'URL')).toBe(1)
    })

    it('should fall back to "url" column', () => {
      const headers = ['name', 'url', 'size']
      expect(findColumnIndex(headers)).toBe(1)
    })

    it('should return -1 if not found', () => {
      const headers = ['name', 'size']
      expect(findColumnIndex(headers, 'missing')).toBe(-1)
    })
  })

  describe('parseCsvClient', () => {
    const csv = `name,url,size
image1,https://example.com/1.jpg,100
image2,https://example.com/2.jpg,200
image3,invalid-url,300`

    it('should parse CSV with preview only', () => {
      const result = parseCsvClient(csv, { previewOnly: true })
      expect(result.headers).toEqual(['name', 'url', 'size'])
      expect(result.rowCount).toBe(3)
      expect(result.urls).toEqual([])
    })

    it('should extract and validate URLs', () => {
      const result = parseCsvClient(csv, { column: 'url' })
      // Note: splitMultipleUrls filters out non-http URLs before validation
      // So "invalid-url" is not included in the count
      expect(result.totalCount).toBe(2)
      expect(result.validCount).toBe(2)
      expect(result.invalidCount).toBe(0)
    })

    it('should include sample rows', () => {
      const result = parseCsvClient(csv, { previewOnly: true })
      expect(result.sampleRows.length).toBeGreaterThan(0)
    })

    it('should estimate image counts per column', () => {
      const result = parseCsvClient(csv, { previewOnly: true })
      expect(result.estimatedImageCounts[1]).toBe(2) // url column has 2 valid URLs
    })
  })

  describe('isSpreadsheetFile', () => {
    it('should detect CSV files', () => {
      const file = new File([''], 'data.csv', { type: 'text/csv' })
      expect(isSpreadsheetFile(file)).toBe(true)
    })

    it('should detect Excel files', () => {
      const file = new File([''], 'data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      expect(isSpreadsheetFile(file)).toBe(true)
    })

    it('should detect by extension', () => {
      const file = new File([''], 'data.xls', { type: '' })
      expect(isSpreadsheetFile(file)).toBe(true)
    })

    it('should return false for non-spreadsheet files', () => {
      const file = new File([''], 'image.jpg', { type: 'image/jpeg' })
      expect(isSpreadsheetFile(file)).toBe(false)
    })
  })

  describe('defaultUrlValidator', () => {
    it('should validate http/https URLs', () => {
      expect(defaultUrlValidator('https://example.com').valid).toBe(true)
      expect(defaultUrlValidator('http://example.com').valid).toBe(true)
    })

    it('should reject non-http protocols', () => {
      const result = defaultUrlValidator('ftp://example.com')
      expect(result.valid).toBe(false)
    })

    it('should reject invalid URLs', () => {
      const result = defaultUrlValidator('not-a-url')
      expect(result.valid).toBe(false)
    })
  })

  describe('sirvUrlValidator', () => {
    it('should validate Sirv URLs', () => {
      const result = sirvUrlValidator('https://myaccount.sirv.com/images/photo.jpg')
      expect(result.valid).toBe(true)
    })

    it('should validate URLs with image extensions', () => {
      const result = sirvUrlValidator('https://example.com/photo.jpg')
      expect(result.valid).toBe(true)
    })

    it('should reject non-image URLs', () => {
      const result = sirvUrlValidator('https://example.com/document.pdf')
      expect(result.valid).toBe(false)
    })
  })
})
