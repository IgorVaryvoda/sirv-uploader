import { useState, useCallback } from 'react'
import clsx from 'clsx'
import { DropZone } from './DropZone'
import { FileList, FileListSummary } from './FileList'
import { FilePicker } from './FilePicker'
import { SpreadsheetImport } from './SpreadsheetImport'
import { useSirvUpload } from '../hooks/useSirvUpload'
import type { SirvUploaderProps, SirvFile, BrowseItem } from '../types'
import { generateId } from '../utils/image-utils'

type TabMode = 'upload' | 'urls'

const DEFAULT_LABELS = {
  dropzone: 'Drop files here or click to browse',
  dropzoneHint: 'Supports JPG, PNG, WebP, GIF, HEIC up to 10MB',
  browse: 'Browse',
  uploadFiles: 'Upload Files',
  importUrls: 'Import URLs',
  selectFromSirv: 'Select from Sirv',
  uploading: 'Uploading...',
  processing: 'Processing...',
  success: 'Uploaded',
  error: 'Failed',
  retry: 'Retry',
  remove: 'Remove',
  cancel: 'Cancel',
  overwrite: 'Overwrite',
  rename: 'Rename',
  skip: 'Skip',
  conflictTitle: 'File exists',
  conflictMessage: 'A file with this name already exists.',
}

export function SirvUploader({
  presignEndpoint,
  proxyEndpoint,
  sirvAccount,
  folder = '/',
  onUpload,
  onError,
  onSelect,
  onRemove,
  features = {},
  maxFiles = 50,
  maxFileSize = 10 * 1024 * 1024,
  accept = ['image/*'],
  onConflict = 'rename',
  autoUpload = true,
  concurrency = 3,
  className,
  disabled = false,
  compact = false,
  theme = 'auto',
  labels: customLabels = {},
  children,
}: SirvUploaderProps) {
  const labels = { ...DEFAULT_LABELS, ...customLabels }
  const {
    batch = true,
    csvImport = true,
    filePicker = true,
    dragDrop = true,
  } = features

  const [activeTab, setActiveTab] = useState<TabMode>('upload')
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Validate configuration
  if (!presignEndpoint && !proxyEndpoint) {
    console.warn('SirvUploader: Either presignEndpoint or proxyEndpoint must be provided')
  }

  const upload = useSirvUpload({
    presignEndpoint,
    proxyEndpoint,
    folder,
    onConflict,
    concurrency,
    autoUpload,
    maxFileSize,
    onUpload,
    onError,
  })

  // Handle files from DropZone
  const handleFiles = useCallback(
    (files: SirvFile[]) => {
      upload.addFiles(files)
      onSelect?.(files)
    },
    [upload, onSelect]
  )

  // Handle spreadsheet file
  const handleSpreadsheet = useCallback(() => {
    setActiveTab('urls')
  }, [])

  // Handle URLs from spreadsheet
  const handleUrls = useCallback(
    (urls: string[]) => {
      upload.addUrls(urls)
    },
    [upload]
  )

  // Handle file picker selection
  const handlePickerSelect = useCallback(
    (items: BrowseItem[]) => {
      const files: SirvFile[] = items.map((item) => ({
        id: generateId(),
        filename: item.name,
        previewUrl: item.thumbnail || '',
        sirvUrl: `https://${sirvAccount}.sirv.com${item.path}`,
        sirvPath: item.path,
        size: item.size,
        status: 'success' as const,
        progress: 100,
      }))

      upload.addFiles(files)
      onSelect?.(files)
    },
    [sirvAccount, upload, onSelect]
  )

  // Handle file removal
  const handleRemove = useCallback(
    (id: string) => {
      const file = upload.files.find((f) => f.id === id)
      upload.removeFile(id)
      if (file) onRemove?.(file)
    },
    [upload, onRemove]
  )

  // Handle upload all
  const handleUploadAll = useCallback(() => {
    upload.uploadAll()
  }, [upload])

  // Handle clear all
  const handleClearAll = useCallback(() => {
    upload.clearFiles()
  }, [upload])

  const hasFiles = upload.files.length > 0
  const hasPendingFiles = upload.files.some((f) => f.status === 'pending' || f.status === 'error')
  const showTabs = csvImport && batch

  // Determine browse endpoint
  const browseEndpoint = proxyEndpoint || (presignEndpoint ? presignEndpoint.replace(/\/presign$/, '') : '')

  const themeClass = theme === 'dark' ? 'sirv-uploader--dark' : theme === 'light' ? 'sirv-uploader--light' : undefined

  return (
    <div className={clsx('sirv-uploader', themeClass, className)}>
      {/* Tabs */}
      {showTabs && (
        <div className="sirv-tabs">
          <button
            type="button"
            className={clsx('sirv-tabs__tab', activeTab === 'upload' && 'sirv-tabs__tab--active')}
            onClick={() => setActiveTab('upload')}
          >
            {labels.uploadFiles}
          </button>
          <button
            type="button"
            className={clsx('sirv-tabs__tab', activeTab === 'urls' && 'sirv-tabs__tab--active')}
            onClick={() => setActiveTab('urls')}
          >
            {labels.importUrls}
          </button>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <>
          {dragDrop && (
            <DropZone
              onFiles={handleFiles}
              onSpreadsheet={csvImport ? handleSpreadsheet : undefined}
              accept={accept}
              maxFiles={batch ? maxFiles : 1}
              maxFileSize={maxFileSize}
              disabled={disabled}
              compact={compact}
              labels={{
                dropzone: labels.dropzone,
                dropzoneHint: labels.dropzoneHint,
                browse: labels.browse,
              }}
            >
              {children}
            </DropZone>
          )}

          {/* File List */}
          {hasFiles && (
            <FileList
              files={upload.files}
              onRemove={handleRemove}
              onRetry={upload.retryFile}
              labels={{
                retry: labels.retry,
                remove: labels.remove,
                uploading: labels.uploading,
                processing: labels.processing,
                success: labels.success,
                error: labels.error,
              }}
            />
          )}
        </>
      )}

      {/* URLs Tab */}
      {activeTab === 'urls' && csvImport && (
        <SpreadsheetImport onUrls={handleUrls} />
      )}

      {/* Toolbar */}
      {(hasFiles || filePicker) && (
        <div className="sirv-uploader__toolbar">
          <div className="sirv-uploader__toolbar-left">
            {filePicker && browseEndpoint && (
              <button
                type="button"
                className="sirv-btn"
                onClick={() => setIsPickerOpen(true)}
                disabled={disabled}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {labels.selectFromSirv}
              </button>
            )}
          </div>

          <div className="sirv-uploader__toolbar-right">
            {hasFiles && (
              <button
                type="button"
                className="sirv-btn"
                onClick={handleClearAll}
                disabled={disabled || upload.isUploading}
              >
                Clear All
              </button>
            )}
            {hasPendingFiles && !autoUpload && (
              <button
                type="button"
                className="sirv-btn sirv-btn--primary"
                onClick={handleUploadAll}
                disabled={disabled || upload.isUploading}
              >
                {upload.isUploading ? labels.uploading : 'Upload All'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {hasFiles && <FileListSummary files={upload.files} />}

      {/* File Picker Modal */}
      {filePicker && browseEndpoint && (
        <FilePicker
          endpoint={browseEndpoint}
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handlePickerSelect}
          multiple={batch}
          initialPath={folder}
          labels={{
            title: labels.selectFromSirv,
            cancel: labels.cancel,
          }}
        />
      )}
    </div>
  )
}
