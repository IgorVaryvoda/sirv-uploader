import { useState, useCallback } from 'react'
import clsx from 'clsx'
import { DropZone } from './DropZone'
import { FileList, FileListSummary } from './FileList'
import { StagedFilesGrid } from './StagedFilesGrid'
import { FilePicker } from './FilePicker'
import { SpreadsheetImport } from './SpreadsheetImport'
import { useSirvUpload } from '../hooks/useSirvUpload'
import { useDropboxChooser, type DropboxFile } from '../hooks/useDropboxChooser'
import { useGoogleDrivePicker, type GoogleDriveFile } from '../hooks/useGoogleDrivePicker'
import type { SirvUploaderProps, SirvFile, BrowseItem } from '../types'
import { generateId, ACCEPTED_ALL_FORMATS } from '../utils/image-utils'

type TabMode = 'upload' | 'urls' | 'dropbox' | 'gdrive'

const DEFAULT_LABELS = {
  dropzone: 'Drop files here or click to browse',
  dropzoneHint: 'Supports JPG, PNG, WebP, GIF, HEIC up to 10MB',
  pasteHint: 'You can also paste images from clipboard',
  browse: 'Browse',
  uploadFiles: 'Upload Files',
  importUrls: 'Import URLs',
  selectFromSirv: 'Select from Sirv',
  importFromDropbox: 'Dropbox',
  importFromGoogleDrive: 'Google Drive',
  uploading: 'Uploading...',
  processing: 'Processing...',
  success: 'Uploaded',
  error: 'Failed',
  retry: 'Retry',
  remove: 'Remove',
  edit: 'Edit',
  addMore: 'Add more',
  clearAll: 'Clear all',
  upload: 'Upload',
  cancel: 'Cancel',
  overwrite: 'Overwrite',
  rename: 'Rename',
  skip: 'Skip',
  conflictTitle: 'File exists',
  conflictMessage: 'A file with this name already exists.',
  filesSelected: 'files selected',
}

// Tab icons
const UploadIcon = () => (
  <svg className="sirv-uploader__tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

const UrlIcon = () => (
  <svg className="sirv-uploader__tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
)

const DropboxIcon = () => (
  <svg className="sirv-uploader__tab-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 2l6 3.75L6 9.5 0 5.75 6 2zm12 0l6 3.75-6 3.75-6-3.75L18 2zM0 13.25L6 9.5l6 3.75L6 17 0 13.25zm18-3.75l6 3.75L18 17l-6-3.75 6-3.75zM6 18.25l6-3.75 6 3.75L12 22l-6-3.75z" />
  </svg>
)

const GoogleDriveIcon = () => (
  <svg className="sirv-uploader__tab-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 5.93h13.68l3.44-5.93L15.14 3.5H7.71zm.79 1.5h5.95l5.14 9H8.08l-5.14-9h5.56z" />
  </svg>
)

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
  dropbox,
  googleDrive,
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
    paste = true,
    allAssets = false,
  } = features

  const [activeTab, setActiveTab] = useState<TabMode>('upload')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<SirvFile[]>([])

  // Determine if we should show staged mode (when autoUpload is false)
  const showStagedMode = !autoUpload && stagedFiles.length > 0

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
      if (autoUpload) {
        upload.addFiles(files)
        onSelect?.(files)
      } else {
        // Stage files for review before upload
        setStagedFiles((prev) => {
          const newFiles = files.filter(
            (f) => !prev.some((p) => p.id === f.id)
          )
          return [...prev, ...newFiles].slice(0, maxFiles)
        })
        onSelect?.(files)
      }
    },
    [upload, onSelect, autoUpload, maxFiles]
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

  // Handle file removal (both staged and uploaded)
  const handleRemove = useCallback(
    (id: string) => {
      if (showStagedMode) {
        setStagedFiles((prev) => prev.filter((f) => f.id !== id))
      } else {
        const file = upload.files.find((f) => f.id === id)
        upload.removeFile(id)
        if (file) onRemove?.(file)
      }
    },
    [upload, onRemove, showStagedMode]
  )

  // Handle staged file edit (placeholder - implement as needed)
  const handleEdit = useCallback((file: SirvFile) => {
    console.log('Edit file:', file.filename)
    // Implement image editor integration here
  }, [])

  // Handle add more files in staged mode
  const handleAddMore = useCallback(
    (files: SirvFile[]) => {
      setStagedFiles((prev) => [...prev, ...files].slice(0, maxFiles))
    },
    [maxFiles]
  )

  // Handle upload all staged files
  const handleUploadAll = useCallback(() => {
    upload.addFiles(stagedFiles)
    setStagedFiles([])
  }, [upload, stagedFiles])

  // Handle clear all staged files
  const handleClearAll = useCallback(() => {
    if (showStagedMode) {
      setStagedFiles([])
    } else {
      upload.clearFiles()
    }
  }, [upload, showStagedMode])

  // Dropbox integration
  const dropboxChooser = useDropboxChooser({
    appKey: dropbox?.appKey || '',
    onSelect: (files: DropboxFile[]) => {
      const sirvFiles: SirvFile[] = files.map((f) => ({
        id: generateId(),
        filename: f.name,
        previewUrl: f.thumbnailLink || '',
        externalUrl: f.link,
        size: f.bytes,
        status: 'pending' as const,
        progress: 0,
      }))
      handleFiles(sirvFiles)
      setActiveTab('upload')
    },
  })

  // Google Drive integration
  const googleDrivePicker = useGoogleDrivePicker({
    clientId: googleDrive?.clientId || '',
    apiKey: googleDrive?.apiKey || '',
    appId: googleDrive?.appId || '',
    onSelect: (files: GoogleDriveFile[], accessToken: string) => {
      const sirvFiles: SirvFile[] = files.map((f) => ({
        id: generateId(),
        filename: f.name,
        previewUrl: f.thumbnails?.[0]?.url || f.iconUrl || '',
        externalUrl: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
        externalAccessToken: accessToken,
        size: f.sizeBytes,
        status: 'pending' as const,
        progress: 0,
      }))
      handleFiles(sirvFiles)
      setActiveTab('upload')
    },
  })

  const hasDropbox = !!dropbox?.appKey && dropboxChooser.isConfigured
  const hasGoogleDrive = !!googleDrive && googleDrivePicker.isConfigured
  const hasFiles = showStagedMode ? stagedFiles.length > 0 : upload.files.length > 0
  const hasPendingFiles = showStagedMode
    ? stagedFiles.some((f) => f.status === 'pending' || f.status === 'error')
    : upload.files.some((f) => f.status === 'pending' || f.status === 'error')
  const showTabs = csvImport || hasDropbox || hasGoogleDrive

  // Determine browse endpoint
  const browseEndpoint = proxyEndpoint || (presignEndpoint ? presignEndpoint.replace(/\/presign$/, '') : '')

  const themeClass = theme === 'dark' ? 'sirv-uploader--dark' : theme === 'light' ? 'sirv-uploader--light' : undefined

  const acceptString = allAssets ? ACCEPTED_ALL_FORMATS : accept.join(',')

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
            <UploadIcon />
            {labels.uploadFiles}
          </button>
          {csvImport && (
            <button
              type="button"
              className={clsx('sirv-tabs__tab', activeTab === 'urls' && 'sirv-tabs__tab--active')}
              onClick={() => setActiveTab('urls')}
            >
              <UrlIcon />
              {labels.importUrls}
            </button>
          )}
          {hasDropbox && (
            <button
              type="button"
              className={clsx('sirv-tabs__tab', activeTab === 'dropbox' && 'sirv-tabs__tab--active')}
              onClick={() => setActiveTab('dropbox')}
            >
              <DropboxIcon />
              {labels.importFromDropbox}
            </button>
          )}
          {hasGoogleDrive && (
            <button
              type="button"
              className={clsx('sirv-tabs__tab', activeTab === 'gdrive' && 'sirv-tabs__tab--active')}
              onClick={() => setActiveTab('gdrive')}
            >
              <GoogleDriveIcon />
              {labels.importFromGoogleDrive}
            </button>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <>
          {showStagedMode ? (
            <StagedFilesGrid
              files={stagedFiles}
              onRemove={handleRemove}
              onEdit={handleEdit}
              onAddMore={handleAddMore}
              maxFiles={maxFiles}
              accept={acceptString}
              disabled={disabled}
              labels={{
                addMore: labels.addMore,
                edit: labels.edit,
                remove: labels.remove,
              }}
            />
          ) : (
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
                  enablePaste={paste}
                  acceptAllAssets={allAssets}
                  labels={{
                    dropzone: labels.dropzone,
                    dropzoneHint: labels.dropzoneHint,
                    browse: labels.browse,
                    pasteHint: labels.pasteHint,
                  }}
                >
                  {children}
                </DropZone>
              )}

              {/* File List (auto-upload mode) */}
              {hasFiles && autoUpload && (
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
        </>
      )}

      {/* URLs Tab */}
      {activeTab === 'urls' && csvImport && (
        <SpreadsheetImport onUrls={handleUrls} />
      )}

      {/* Dropbox Tab */}
      {activeTab === 'dropbox' && hasDropbox && (
        <div className="sirv-uploader__external-picker">
          <div className="sirv-uploader__external-icon sirv-uploader__external-icon--dropbox">
            <DropboxIcon />
          </div>
          <h3 className="sirv-uploader__external-title">Import from Dropbox</h3>
          <p className="sirv-uploader__external-description">
            Select files from your Dropbox account
          </p>
          <button
            type="button"
            className="sirv-btn sirv-btn--primary sirv-btn--dropbox"
            onClick={dropboxChooser.openChooser}
            disabled={disabled || dropboxChooser.isLoading}
          >
            {dropboxChooser.isLoading ? labels.uploading : 'Open Dropbox'}
          </button>
        </div>
      )}

      {/* Google Drive Tab */}
      {activeTab === 'gdrive' && hasGoogleDrive && (
        <div className="sirv-uploader__external-picker">
          <div className="sirv-uploader__external-icon sirv-uploader__external-icon--gdrive">
            <GoogleDriveIcon />
          </div>
          <h3 className="sirv-uploader__external-title">Import from Google Drive</h3>
          <p className="sirv-uploader__external-description">
            Select files from your Google Drive
          </p>
          <button
            type="button"
            className="sirv-btn sirv-btn--primary sirv-btn--gdrive"
            onClick={googleDrivePicker.openPicker}
            disabled={disabled || googleDrivePicker.isLoading}
          >
            {googleDrivePicker.isLoading ? labels.uploading : 'Open Google Drive'}
          </button>
        </div>
      )}

      {/* Toolbar */}
      {(hasFiles || filePicker) && activeTab === 'upload' && (
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
              <>
                <span className="sirv-uploader__file-count">
                  {showStagedMode ? stagedFiles.length : upload.files.length} {labels.filesSelected}
                </span>
                <button
                  type="button"
                  className="sirv-btn"
                  onClick={handleClearAll}
                  disabled={disabled || upload.isUploading}
                >
                  {labels.clearAll}
                </button>
              </>
            )}
            {showStagedMode && hasPendingFiles && (
              <button
                type="button"
                className="sirv-btn sirv-btn--primary"
                onClick={handleUploadAll}
                disabled={disabled}
              >
                <UploadIcon />
                {labels.upload}
              </button>
            )}
            {!showStagedMode && hasPendingFiles && !autoUpload && (
              <button
                type="button"
                className="sirv-btn sirv-btn--primary"
                onClick={upload.uploadAll}
                disabled={disabled || upload.isUploading}
              >
                {upload.isUploading ? labels.uploading : labels.upload}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {hasFiles && autoUpload && <FileListSummary files={upload.files} />}

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
