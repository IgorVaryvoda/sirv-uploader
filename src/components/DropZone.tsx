import { useCallback, useState, useRef } from 'react'
import clsx from 'clsx'
import {
  isImageFile,
  isHeifFile,
  convertHeicWithFallback,
  validateFileSize,
  generateId,
  getImageDimensions,
  ACCEPTED_IMAGE_FORMATS,
} from '../utils/image-utils'
import { isSpreadsheetFile } from '../utils/csv-parser'
import type { SirvFile } from '../types'

export interface DropZoneProps {
  onFiles: (files: SirvFile[]) => void
  onSpreadsheet?: (file: File) => void
  accept?: string[]
  maxFiles?: number
  maxFileSize?: number
  disabled?: boolean
  compact?: boolean
  className?: string
  labels?: {
    dropzone?: string
    dropzoneHint?: string
    browse?: string
  }
  children?: React.ReactNode
}

export function DropZone({
  onFiles,
  onSpreadsheet,
  accept = ['image/*'],
  maxFiles = 50,
  maxFileSize = 10 * 1024 * 1024,
  disabled = false,
  compact = false,
  className,
  labels = {},
  children,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [convertingCount, setConvertingCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).slice(0, maxFiles)

      // Check for spreadsheet files
      const spreadsheetFile = files.find(isSpreadsheetFile)
      if (spreadsheetFile && onSpreadsheet) {
        onSpreadsheet(spreadsheetFile)
        return
      }

      // Filter to image files only
      const imageFiles = files.filter(isImageFile)
      if (imageFiles.length === 0) return

      // Check for HEIF files that need conversion
      const heifFiles = imageFiles.filter(isHeifFile)
      const regularFiles = imageFiles.filter((f) => !isHeifFile(f))

      setIsConverting(heifFiles.length > 0)
      setConvertingCount(heifFiles.length)

      const processedFiles: SirvFile[] = []

      // Process regular files
      for (const file of regularFiles) {
        const sizeValidation = validateFileSize(file, maxFileSize)
        if (!sizeValidation.valid) {
          processedFiles.push({
            id: generateId(),
            file,
            filename: file.name,
            previewUrl: '',
            status: 'error',
            progress: 0,
            error: sizeValidation.error,
          })
          continue
        }

        const dimensions = await getImageDimensions(file)
        processedFiles.push({
          id: generateId(),
          file,
          filename: file.name,
          previewUrl: URL.createObjectURL(file),
          dimensions: dimensions || undefined,
          size: file.size,
          status: 'pending',
          progress: 0,
        })
      }

      // Convert HEIF files
      for (const file of heifFiles) {
        try {
          const converted = await convertHeicWithFallback(file)
          const sizeValidation = validateFileSize(converted, maxFileSize)
          if (!sizeValidation.valid) {
            processedFiles.push({
              id: generateId(),
              file: converted,
              filename: converted.name,
              previewUrl: '',
              status: 'error',
              progress: 0,
              error: sizeValidation.error,
            })
            continue
          }

          const dimensions = await getImageDimensions(converted)
          processedFiles.push({
            id: generateId(),
            file: converted,
            filename: converted.name,
            previewUrl: URL.createObjectURL(converted),
            dimensions: dimensions || undefined,
            size: converted.size,
            status: 'pending',
            progress: 0,
          })
        } catch (err) {
          processedFiles.push({
            id: generateId(),
            file,
            filename: file.name,
            previewUrl: '',
            status: 'error',
            progress: 0,
            error: err instanceof Error ? err.message : 'Failed to convert HEIC file',
          })
        }
        setConvertingCount((c) => c - 1)
      }

      setIsConverting(false)
      setConvertingCount(0)

      if (processedFiles.length > 0) {
        onFiles(processedFiles)
      }
    },
    [maxFiles, maxFileSize, onFiles, onSpreadsheet]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragOver(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (disabled) return

      const { files } = e.dataTransfer
      if (files.length > 0) {
        await processFiles(files)
      }
    },
    [disabled, processFiles]
  )

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target
      if (files && files.length > 0) {
        await processFiles(files)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [processFiles]
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [disabled]
  )

  const acceptString = accept.join(',') || ACCEPTED_IMAGE_FORMATS

  return (
    <div
      className={clsx(
        'sirv-dropzone',
        isDragOver && 'sirv-dropzone--drag-over',
        disabled && 'sirv-dropzone--disabled',
        compact && 'sirv-dropzone--compact',
        isConverting && 'sirv-dropzone--converting',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={labels.dropzone || 'Drop files here or click to browse'}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        multiple={maxFiles > 1}
        onChange={handleChange}
        disabled={disabled}
        className="sirv-dropzone__input"
        aria-hidden="true"
      />

      {children || (
        <div className="sirv-dropzone__content">
          {isConverting ? (
            <>
              <div className="sirv-dropzone__spinner" />
              <p className="sirv-dropzone__text">
                Converting {convertingCount} HEIC file{convertingCount !== 1 ? 's' : ''}...
              </p>
            </>
          ) : (
            <>
              <svg
                className="sirv-dropzone__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="sirv-dropzone__text">
                {labels.dropzone || 'Drop files here or click to browse'}
              </p>
              {!compact && (
                <p className="sirv-dropzone__hint">
                  {labels.dropzoneHint || 'Supports JPG, PNG, WebP, GIF, HEIC up to 10MB'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
