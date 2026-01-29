import { useState, useCallback, useMemo, memo } from 'react'
import clsx from 'clsx'
import { DropZone } from './DropZone'
import { FileList, FileListSummary } from './FileList'
import { StagedFilesGrid } from './StagedFilesGrid'
import { SpreadsheetImport } from './SpreadsheetImport'
import { UploadIcon, UrlIcon, DropboxIcon, GoogleDriveIcon } from './icons'
import { useSirvUpload } from '../hooks/useSirvUpload'
import { useDropboxChooser, type DropboxFile } from '../hooks/useDropboxChooser'
import { useGoogleDrivePicker, type GoogleDriveFile } from '../hooks/useGoogleDrivePicker'
import { useExternalImport } from '../hooks/useExternalImport'
import type { SirvUploaderProps, SirvFile } from '../types'
import { ACCEPTED_ALL_FORMATS } from '../utils/image-utils'

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

// Memoized tab button to prevent unnecessary re-renders
interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

const TabButton = memo(function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      className={clsx('sirv-tabs__tab', active && 'sirv-tabs__tab--active')}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
})

// Memoized external picker panel
interface ExternalPickerPanelProps {
  icon: React.ReactNode
  title: string
  description: string
  buttonLabel: string
  onOpen: () => void
  disabled: boolean
  isLoading: boolean
  variant: 'dropbox' | 'gdrive'
}

const ExternalPickerPanel = memo(function ExternalPickerPanel({
  icon,
  title,
  description,
  buttonLabel,
  onOpen,
  disabled,
  isLoading,
  variant,
}: ExternalPickerPanelProps) {
  return (
    <div className="sirv-uploader__external-picker">
      <div className={`sirv-uploader__external-icon sirv-uploader__external-icon--${variant}`}>
        {icon}
      </div>
      <h3 className="sirv-uploader__external-title">{title}</h3>
      <p className="sirv-uploader__external-description">{description}</p>
      <button
        type="button"
        className={`sirv-btn sirv-btn--primary sirv-btn--${variant}`}
        onClick={onOpen}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Loading...' : buttonLabel}
      </button>
    </div>
  )
})

export function SirvUploader({
  proxyEndpoint,
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
  // Memoize labels to prevent child re-renders
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...customLabels }), [customLabels])

  const {
    batch = true,
    csvImport = true,
    dragDrop = true,
    paste = true,
    allAssets = false,
    imageEditor = true,
  } = features

  const [activeTab, setActiveTab] = useState<TabMode>('upload')
  const [stagedFiles, setStagedFiles] = useState<SirvFile[]>([])

  // Validate configuration (only warn once)
  useMemo(() => {
    if (!proxyEndpoint) {
      console.warn('SirvUploader: proxyEndpoint is required')
    }
  }, [proxyEndpoint])

  const upload = useSirvUpload({
    proxyEndpoint,
    folder,
    onConflict,
    concurrency,
    autoUpload,
    maxFileSize,
    onUpload,
    onError,
  })

  // Memoize computed values
  const showStagedMode = !autoUpload && stagedFiles.length > 0
  const hasFiles = showStagedMode ? stagedFiles.length > 0 : upload.files.length > 0
  const hasPendingFiles = useMemo(() => {
    const files = showStagedMode ? stagedFiles : upload.files
    return files.some((f) => f.status === 'pending' || f.status === 'error')
  }, [showStagedMode, stagedFiles, upload.files])

  const acceptString = useMemo(
    () => (allAssets ? ACCEPTED_ALL_FORMATS : accept.join(',')),
    [allAssets, accept]
  )

  const themeClass = useMemo(
    () => (theme === 'dark' ? 'sirv-uploader--dark' : theme === 'light' ? 'sirv-uploader--light' : undefined),
    [theme]
  )

  // Handler for files from any source
  const handleFiles = useCallback(
    (files: SirvFile[]) => {
      if (autoUpload) {
        upload.addFiles(files)
        onSelect?.(files)
      } else {
        setStagedFiles((prev) => {
          const newFiles = files.filter((f) => !prev.some((p) => p.id === f.id))
          return [...prev, ...newFiles].slice(0, maxFiles)
        })
        onSelect?.(files)
      }
    },
    [upload, onSelect, autoUpload, maxFiles]
  )

  // External import hook (shared logic for URLs, Dropbox, Google Drive)
  const externalImport = useExternalImport({
    maxFiles,
    onComplete: useCallback(
      (files: SirvFile[]) => {
        handleFiles(files)
        setActiveTab('upload')
      },
      [handleFiles]
    ),
  })

  // Handle spreadsheet file
  const handleSpreadsheet = useCallback(() => {
    setActiveTab('urls')
  }, [])

  // Handle URLs from spreadsheet
  const handleUrls = useCallback(
    async (urls: string[]) => {
      await externalImport.importFiles(
        urls.map((url) => ({
          url,
          name: url.split('/').pop()?.split('?')[0] || 'image.png',
        })),
        'URLs'
      )
    },
    [externalImport]
  )

  // Handle file removal - also revoke preview URLs to prevent memory leaks
  const handleRemove = useCallback(
    (id: string) => {
      if (showStagedMode) {
        setStagedFiles((prev) => {
          const fileToRemove = prev.find((f) => f.id === id)
          if (fileToRemove?.previewUrl) {
            URL.revokeObjectURL(fileToRemove.previewUrl)
          }
          return prev.filter((f) => f.id !== id)
        })
      } else {
        const file = upload.files.find((f) => f.id === id)
        if (file?.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
        upload.removeFile(id)
        if (file) onRemove?.(file)
      }
    },
    [upload, onRemove, showStagedMode]
  )

  // Handle file edit (legacy callback)
  const handleEdit = useCallback((file: SirvFile) => {
    console.log('Edit file:', file.filename)
  }, [])

  // Handle file edited via built-in editor
  const handleFileEdited = useCallback(
    (id: string, editedFile: File, previewUrl: string) => {
      setStagedFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, file: editedFile, filename: editedFile.name, previewUrl, size: editedFile.size }
            : f
        )
      )
    },
    []
  )

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

  // Handle clear all - revoke all preview URLs to prevent memory leaks
  const handleClearAll = useCallback(() => {
    if (showStagedMode) {
      stagedFiles.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
      setStagedFiles([])
    } else {
      upload.files.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
      upload.clearFiles()
    }
  }, [upload, showStagedMode, stagedFiles])

  // Dropbox integration
  const dropboxChooser = useDropboxChooser({
    appKey: dropbox?.appKey || '',
    onSelect: useCallback(
      async (files: DropboxFile[]) => {
        await externalImport.importFiles(
          files.map((f) => ({ url: f.link, name: f.name })),
          'Dropbox'
        )
      },
      [externalImport]
    ),
  })

  // Google Drive integration
  const googleDrivePicker = useGoogleDrivePicker({
    clientId: googleDrive?.clientId || '',
    apiKey: googleDrive?.apiKey || '',
    appId: googleDrive?.appId || '',
    onSelect: useCallback(
      async (files: GoogleDriveFile[], accessToken: string) => {
        await externalImport.importFiles(
          files.map((f) => ({
            url: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
            name: f.name,
            accessToken,
          })),
          'Google Drive'
        )
      },
      [externalImport]
    ),
  })

  const hasDropbox = !!dropbox?.appKey && dropboxChooser.isConfigured
  const hasGoogleDrive = !!googleDrive && googleDrivePicker.isConfigured
  const showTabs = csvImport || hasDropbox || hasGoogleDrive

  // Memoize label subsets for child components
  const dropzoneLabels = useMemo(
    () => ({
      dropzone: labels.dropzone,
      dropzoneHint: labels.dropzoneHint,
      browse: labels.browse,
      pasteHint: labels.pasteHint,
    }),
    [labels]
  )

  const stagedGridLabels = useMemo(
    () => ({
      addMore: labels.addMore,
      edit: labels.edit,
      remove: labels.remove,
    }),
    [labels]
  )

  const fileListLabels = useMemo(
    () => ({
      retry: labels.retry,
      remove: labels.remove,
      uploading: labels.uploading,
      processing: labels.processing,
      success: labels.success,
      error: labels.error,
    }),
    [labels]
  )

  return (
    <div className={clsx('sirv-uploader', themeClass, className)}>
      {/* Tabs */}
      {showTabs && (
        <div className="sirv-tabs">
          <TabButton
            active={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            icon={<UploadIcon />}
            label={labels.uploadFiles}
          />
          {csvImport && (
            <TabButton
              active={activeTab === 'urls'}
              onClick={() => setActiveTab('urls')}
              icon={<UrlIcon />}
              label={labels.importUrls}
            />
          )}
          {hasDropbox && (
            <TabButton
              active={activeTab === 'dropbox'}
              onClick={() => setActiveTab('dropbox')}
              icon={<DropboxIcon />}
              label={labels.importFromDropbox}
            />
          )}
          {hasGoogleDrive && (
            <TabButton
              active={activeTab === 'gdrive'}
              onClick={() => setActiveTab('gdrive')}
              icon={<GoogleDriveIcon />}
              label={labels.importFromGoogleDrive}
            />
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
              onFileEdited={handleFileEdited}
              onAddMore={handleAddMore}
              maxFiles={maxFiles}
              accept={acceptString}
              disabled={disabled}
              enableEditor={imageEditor}
              labels={stagedGridLabels}
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
                  labels={dropzoneLabels}
                >
                  {children}
                </DropZone>
              )}

              {upload.files.length > 0 && (
                <FileList
                  files={upload.files}
                  onRemove={handleRemove}
                  onRetry={upload.retryFile}
                  labels={fileListLabels}
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

      {/* Import Progress Overlay */}
      {externalImport.isImporting && (
        <div className="sirv-uploader__import-progress">
          <div className="sirv-uploader__import-spinner" />
          <p className="sirv-uploader__import-text">
            Importing from {externalImport.progress.source}...
          </p>
          <p className="sirv-uploader__import-count">
            {externalImport.progress.current} / {externalImport.progress.total}
          </p>
        </div>
      )}

      {/* Dropbox Tab */}
      {activeTab === 'dropbox' && hasDropbox && !externalImport.isImporting && (
        <ExternalPickerPanel
          icon={<DropboxIcon />}
          title="Import from Dropbox"
          description="Select files from your Dropbox account"
          buttonLabel="Open Dropbox"
          onOpen={dropboxChooser.openChooser}
          disabled={disabled}
          isLoading={dropboxChooser.isLoading}
          variant="dropbox"
        />
      )}

      {/* Google Drive Tab */}
      {activeTab === 'gdrive' && hasGoogleDrive && !externalImport.isImporting && (
        <ExternalPickerPanel
          icon={<GoogleDriveIcon />}
          title="Import from Google Drive"
          description="Select files from your Google Drive"
          buttonLabel="Open Google Drive"
          onOpen={googleDrivePicker.openPicker}
          disabled={disabled}
          isLoading={googleDrivePicker.isLoading}
          variant="gdrive"
        />
      )}

      {/* Toolbar */}
      {hasFiles && activeTab === 'upload' && (
        <div className="sirv-uploader__toolbar">
          <div className="sirv-uploader__toolbar-left" />

          <div className="sirv-uploader__toolbar-right">
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
      {upload.files.length > 0 && <FileListSummary files={upload.files} />}
    </div>
  )
}
