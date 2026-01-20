import { useState, useCallback, useRef } from 'react'
import clsx from 'clsx'
import {
  parseCsvClient,
  parseExcelClient,
  isSpreadsheetFile,
  type ClientParseResult,
} from '../utils/csv-parser'

export interface SpreadsheetImportProps {
  onUrls: (urls: string[]) => void
  className?: string
  labels?: {
    drop?: string
    hint?: string
    validUrls?: string
    invalidUrls?: string
    import?: string
    clear?: string
  }
}

export function SpreadsheetImport({
  onUrls,
  className,
  labels = {},
}: SpreadsheetImportProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ClientParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      let parseResult: ClientParseResult

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const text = await file.text()
        parseResult = parseCsvClient(text, { previewOnly: true })
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        parseResult = await parseExcelClient(buffer, { previewOnly: true })
      } else {
        throw new Error('Unsupported file type. Please use CSV, XLSX, or TXT.')
      }

      setResult(parseResult)

      // Auto-select column with most URLs
      const maxIndex = parseResult.estimatedImageCounts.indexOf(
        Math.max(...parseResult.estimatedImageCounts)
      )
      if (maxIndex >= 0 && parseResult.headers[maxIndex]) {
        setSelectedColumn(parseResult.headers[maxIndex])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const file = e.dataTransfer.files[0]
      if (file && isSpreadsheetFile(file)) {
        await processFile(file)
      } else {
        setError('Please drop a CSV or Excel file')
      }
    },
    [processFile]
  )

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await processFile(file)
      }
      e.target.value = ''
    },
    [processFile]
  )

  const handleImport = useCallback(async () => {
    if (!result || !selectedColumn) return

    setIsLoading(true)
    try {
      // Re-parse with URL extraction
      // For now, use the URLs from the preview result
      // In a real implementation, we'd re-parse with the selected column
      const validUrls = result.urls.filter((u) => u.valid).map((u) => u.url)
      onUrls(validUrls)
      setResult(null)
      setSelectedColumn('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import URLs')
    } finally {
      setIsLoading(false)
    }
  }, [result, selectedColumn, onUrls])

  const handleClear = useCallback(() => {
    setResult(null)
    setSelectedColumn('')
    setError(null)
  }, [])

  return (
    <div className={clsx('sirv-spreadsheet', className)}>
      {!result ? (
        <>
          <div
            className={clsx(
              'sirv-spreadsheet__drop',
              isDragOver && 'sirv-spreadsheet__drop--active'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                inputRef.current?.click()
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleChange}
              style={{ display: 'none' }}
            />

            {isLoading ? (
              <div className="sirv-dropzone__spinner" />
            ) : (
              <>
                <svg
                  className="sirv-spreadsheet__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <p className="sirv-spreadsheet__text">
                  {labels.drop || 'Drop CSV or Excel file here'}
                </p>
                <p className="sirv-spreadsheet__hint">
                  {labels.hint || 'File should contain a column with image URLs'}
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="sirv-filelist__error" style={{ padding: '8px 16px' }}>
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="sirv-spreadsheet__preview">
          {/* Column selector */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Select URL column:
            </label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--sirv-border)',
              }}
            >
              <option value="">Select a column</option>
              {result.headers.map((header, i) => (
                <option key={i} value={header}>
                  {header} ({result.estimatedImageCounts[i]} URLs)
                </option>
              ))}
            </select>
          </div>

          {/* Preview table */}
          <table className="sirv-spreadsheet__table">
            <thead>
              <tr>
                {result.headers.map((header, i) => (
                  <th
                    key={i}
                    style={{
                      background:
                        header === selectedColumn
                          ? 'var(--sirv-primary-light)'
                          : undefined,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.sampleRows.slice(0, 3).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        background:
                          result.headers[j] === selectedColumn
                            ? 'var(--sirv-primary-light)'
                            : undefined,
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Stats */}
          <div className="sirv-spreadsheet__stats">
            <span>Total rows: {result.rowCount}</span>
            {selectedColumn && (
              <>
                <span className="sirv-spreadsheet__stat--valid">
                  {labels.validUrls || 'Valid URLs'}:{' '}
                  {result.estimatedImageCounts[result.headers.indexOf(selectedColumn)] || 0}
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="sirv-btn" onClick={handleClear}>
              {labels.clear || 'Clear'}
            </button>
            <button
              type="button"
              className="sirv-btn sirv-btn--primary"
              onClick={handleImport}
              disabled={!selectedColumn || isLoading}
            >
              {isLoading ? 'Importing...' : labels.import || 'Import URLs'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
