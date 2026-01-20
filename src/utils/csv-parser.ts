/**
 * Client-side CSV/Excel parsing utilities
 * ExcelJS is dynamically imported to avoid bundling ~300KB in initial load
 */

export type CellValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | { text: string }
  | { result: unknown }

const DELIMITERS = [',', '\t', ';', '|'] as const
export type CsvDelimiter = (typeof DELIMITERS)[number]

/**
 * Detect the delimiter used in CSV content by analyzing the first few lines
 */
export function detectDelimiter(csvContent: string): CsvDelimiter {
  const lines = csvContent.trim().split(/\r?\n/).slice(0, 5)
  if (lines.length === 0) return ','

  const delimiterCounts: Record<CsvDelimiter, number[]> = {
    ',': [],
    '\t': [],
    ';': [],
    '|': [],
  }

  for (const line of lines) {
    let inQuotes = false
    const counts: Record<CsvDelimiter, number> = { ',': 0, '\t': 0, ';': 0, '|': 0 }

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (!inQuotes) {
        if (char in counts) {
          counts[char as CsvDelimiter]++
        }
      }
    }

    for (const delim of DELIMITERS) {
      delimiterCounts[delim].push(counts[delim])
    }
  }

  let bestDelimiter: CsvDelimiter = ','
  let bestScore = -1

  for (const delim of DELIMITERS) {
    const counts = delimiterCounts[delim]
    if (counts.length === 0) continue

    const nonZero = counts.filter((c) => c > 0)
    if (nonZero.length === 0) continue

    const allSame = nonZero.every((c) => c === nonZero[0])
    const avgCount = nonZero.reduce((a, b) => a + b, 0) / nonZero.length
    const coverage = nonZero.length / counts.length

    const score = (allSame ? 100 : 0) + avgCount * coverage

    if (score > bestScore && avgCount > 0) {
      bestScore = score
      bestDelimiter = delim
    }
  }

  return bestDelimiter
}

/**
 * Parse a single CSV row, handling quoted fields
 */
export function parseCsvRow(line: string, delimiter: CsvDelimiter = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''))
  return result
}

/**
 * Split comma-separated URLs in a cell value
 */
export function splitMultipleUrls(cellValue: string): string[] {
  if (!cellValue) return []
  return cellValue
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0 && url.startsWith('http'))
}

/**
 * Extract pathname from a URL string
 */
export function extractPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/**
 * Convert ExcelJS cell value to string
 */
export function cellToString(cell: CellValue): string {
  if (cell == null) return ''
  if (typeof cell === 'object' && 'text' in cell) return cell.text
  if (typeof cell === 'object' && 'result' in cell) return String(cell.result ?? '')
  return String(cell)
}

/**
 * Get headers from CSV content
 */
export function getCsvHeaders(csvContent: string, delimiter?: CsvDelimiter): string[] {
  const lines = csvContent.trim().split(/\r?\n/)
  if (lines.length === 0) return []
  const delim = delimiter ?? detectDelimiter(csvContent)
  return parseCsvRow(lines[0], delim)
}

/**
 * Find column index by name (case-insensitive), falling back to "url"
 */
export function findColumnIndex(headers: string[], column?: string): number {
  const headersLower = headers.map((h) => h.toLowerCase())

  if (column) {
    let columnIndex = headersLower.indexOf(column.toLowerCase())
    if (columnIndex !== -1) return columnIndex
    columnIndex = headers.indexOf(column)
    if (columnIndex !== -1) return columnIndex
  }

  return headersLower.findIndex((h) => h === 'url')
}

export interface ParsedUrlItem {
  url: string
  path: string
  valid: boolean
  error?: string
}

/**
 * Validate a URL - customizable validator
 */
export type UrlValidator = (url: string) => { valid: boolean; error?: string }

export const defaultUrlValidator: UrlValidator = (url: string) => {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http or https protocol' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

export const sirvUrlValidator: UrlValidator = (url: string) => {
  // Match standard Sirv URL: https://{alias}.sirv.com/{path}
  const sirvMatch = url.match(/^https?:\/\/([^.]+)\.sirv\.com(\/[^?#]+)/)
  if (sirvMatch) {
    return { valid: true }
  }

  // Match URLs with image extension
  const imageMatch = url.match(
    /^https?:\/\/[^/]+(\/[^?#]+\.(jpe?g|png|gif|webp|avif|bmp|tiff?))$/i
  )
  if (imageMatch) {
    return { valid: true }
  }

  return { valid: false, error: 'Not a valid Sirv or image URL' }
}

/**
 * Parse Excel buffer in the browser
 * ExcelJS is dynamically imported to reduce initial bundle size
 */
export async function parseExcelArrayBuffer(arrayBuffer: ArrayBuffer): Promise<CellValue[][]> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.default.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const rows: CellValue[][] = []
  worksheet.eachRow((row) => {
    const values = row.values as CellValue[]
    rows.push(values.slice(1)) // Remove undefined first element (1-indexed)
  })

  return rows
}

/**
 * Get headers from Excel rows
 */
export function getExcelHeaders(rows: CellValue[][]): string[] {
  if (rows.length === 0) return []
  return rows[0].map((cell, i) => cellToString(cell) || `Column ${i + 1}`)
}

/**
 * Get sample rows from Excel
 */
export function getExcelSampleRows(rows: CellValue[][], urlColumnIndex: number): string[][] {
  if (rows.length < 2) return []

  const sampleRows: string[][] = []

  for (let i = 1; i < rows.length && sampleRows.length < 3; i++) {
    const urlCell = cellToString(rows[i][urlColumnIndex]).trim()
    if (urlCell && urlCell.length > 0) {
      sampleRows.push(rows[i].map((cell) => cellToString(cell)))
    }
  }

  if (sampleRows.length === 0) {
    return rows.slice(1, 4).map((row) => row.map((cell) => cellToString(cell)))
  }

  return sampleRows
}

/**
 * Get sample rows from CSV
 */
export function getCsvSampleRows(
  lines: string[],
  urlColumnIndex: number,
  delimiter: CsvDelimiter = ','
): string[][] {
  if (lines.length < 2) return []

  const sampleRows: string[][] = []

  for (let i = 1; i < lines.length && sampleRows.length < 3; i++) {
    const row = parseCsvRow(lines[i], delimiter)
    const urlCell = row[urlColumnIndex]?.trim()
    if (urlCell && urlCell.length > 0) {
      sampleRows.push(row)
    }
  }

  if (sampleRows.length === 0) {
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      sampleRows.push(parseCsvRow(lines[i], delimiter))
    }
  }

  return sampleRows
}

/**
 * Estimate image count in an Excel column
 */
export function estimateExcelImageCount(rows: CellValue[][], columnIndex: number): number {
  if (rows.length < 2 || columnIndex < 0) return rows.length - 1

  let count = 0
  for (let i = 1; i < rows.length; i++) {
    const cellValue = cellToString(rows[i][columnIndex]).trim()
    if (cellValue) {
      count += splitMultipleUrls(cellValue).length
    }
  }
  return count || rows.length - 1
}

/**
 * Estimate image count in a CSV column
 */
export function estimateCsvImageCount(
  lines: string[],
  columnIndex: number,
  delimiter: CsvDelimiter = ','
): number {
  if (lines.length < 2 || columnIndex < 0) return lines.length - 1

  let count = 0
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i], delimiter)
    const cellValue = values[columnIndex]?.trim()
    if (cellValue) {
      count += splitMultipleUrls(cellValue).length
    }
  }
  return count || lines.length - 1
}

export interface ClientParseResult {
  headers: string[]
  sampleRows: string[][]
  rowCount: number
  estimatedImageCounts: number[]
  urls: ParsedUrlItem[]
  validCount: number
  invalidCount: number
  totalCount: number
}

export interface ParseOptions {
  column?: string
  previewOnly?: boolean
  validator?: UrlValidator
}

/**
 * Parse CSV content client-side with preview and URL extraction
 */
export function parseCsvClient(
  csvContent: string,
  options: ParseOptions = {}
): ClientParseResult {
  const { validator = defaultUrlValidator } = options
  const lines = csvContent.trim().split(/\r?\n/)
  const delimiter = detectDelimiter(csvContent)
  const headers = getCsvHeaders(csvContent, delimiter)
  const rowCount = lines.length - 1
  const headersLower = headers.map((h) => h.toLowerCase())

  // Find likely URL column
  let urlColumnIndex = headersLower.findIndex(
    (h) => h === 'url' || h === 'image' || h === 'images' || h === 'image_url'
  )
  if (urlColumnIndex === -1) {
    for (let col = 0; col < headers.length && urlColumnIndex === -1; col++) {
      for (let row = 1; row < Math.min(100, lines.length); row++) {
        const values = parseCsvRow(lines[row], delimiter)
        const cell = values[col]?.trim()
        if (cell && cell.startsWith('http')) {
          urlColumnIndex = col
          break
        }
      }
    }
  }
  if (urlColumnIndex === -1) urlColumnIndex = 0

  const sampleRows = getCsvSampleRows(lines, urlColumnIndex, delimiter)
  const estimatedImageCounts = headers.map((_, colIndex) =>
    estimateCsvImageCount(lines, colIndex, delimiter)
  )

  if (options.previewOnly) {
    return {
      headers,
      sampleRows,
      rowCount,
      estimatedImageCounts,
      urls: [],
      validCount: 0,
      invalidCount: 0,
      totalCount: 0,
    }
  }

  const columnIndex = findColumnIndex(headers, options.column)
  if (columnIndex === -1) {
    throw new Error('Column not found in CSV')
  }

  const urls: ParsedUrlItem[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i], delimiter)
    const cellValue = values[columnIndex]?.trim()
    if (cellValue) {
      for (const url of splitMultipleUrls(cellValue)) {
        const validation = validator(url)
        urls.push({
          url,
          path: extractPathFromUrl(url),
          valid: validation.valid,
          error: validation.error,
        })
      }
    }
  }

  const validCount = urls.filter((u) => u.valid).length

  return {
    headers,
    sampleRows,
    rowCount,
    estimatedImageCounts,
    urls,
    validCount,
    invalidCount: urls.length - validCount,
    totalCount: urls.length,
  }
}

/**
 * Parse Excel file client-side with preview and URL extraction
 */
export async function parseExcelClient(
  arrayBuffer: ArrayBuffer,
  options: ParseOptions = {}
): Promise<ClientParseResult> {
  const { validator = defaultUrlValidator } = options
  const rows = await parseExcelArrayBuffer(arrayBuffer)
  const headers = getExcelHeaders(rows)
  const rowCount = rows.length - 1
  const headersLower = headers.map((h) => h.toLowerCase())

  // Find likely URL column
  let urlColumnIndex = headersLower.findIndex(
    (h) => h === 'url' || h === 'image' || h === 'images' || h === 'image_url'
  )
  if (urlColumnIndex === -1) {
    for (let col = 0; col < headers.length && urlColumnIndex === -1; col++) {
      for (let row = 1; row < Math.min(100, rows.length); row++) {
        const cell = cellToString(rows[row][col]).trim()
        if (cell && cell.startsWith('http')) {
          urlColumnIndex = col
          break
        }
      }
    }
  }
  if (urlColumnIndex === -1) urlColumnIndex = 0

  const sampleRows = getExcelSampleRows(rows, urlColumnIndex)
  const estimatedImageCounts = headers.map((_, colIndex) =>
    estimateExcelImageCount(rows, colIndex)
  )

  if (options.previewOnly) {
    return {
      headers,
      sampleRows,
      rowCount,
      estimatedImageCounts,
      urls: [],
      validCount: 0,
      invalidCount: 0,
      totalCount: 0,
    }
  }

  const columnIndex = findColumnIndex(headers, options.column)
  if (columnIndex === -1) {
    throw new Error('Column not found in Excel file')
  }

  const urls: ParsedUrlItem[] = []
  for (let i = 1; i < rows.length; i++) {
    const cellValue = cellToString(rows[i][columnIndex]).trim()
    if (cellValue) {
      for (const url of splitMultipleUrls(cellValue)) {
        const validation = validator(url)
        urls.push({
          url,
          path: extractPathFromUrl(url),
          valid: validation.valid,
          error: validation.error,
        })
      }
    }
  }

  const validCount = urls.filter((u) => u.valid).length

  return {
    headers,
    sampleRows,
    rowCount,
    estimatedImageCounts,
    urls,
    validCount,
    invalidCount: urls.length - validCount,
    totalCount: urls.length,
  }
}

/**
 * Detect if a file is a spreadsheet type
 */
export function isSpreadsheetFile(file: File): boolean {
  const ext = file.name.toLowerCase()
  return (
    ext.endsWith('.csv') ||
    ext.endsWith('.xlsx') ||
    ext.endsWith('.xls') ||
    ext.endsWith('.txt') ||
    file.type === 'text/csv' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  )
}
