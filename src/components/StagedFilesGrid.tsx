import { useCallback, useRef } from 'react'
import clsx from 'clsx'
import { formatFileSize, generateId, canPreviewFile } from '../utils/image-utils'
import type { SirvFile, FileCategory } from '../types'

export interface StagedFilesGridProps {
  files: SirvFile[]
  onRemove: (id: string) => void
  onEdit?: (file: SirvFile) => void
  onAddMore?: (files: SirvFile[]) => void
  maxFiles?: number
  accept?: string
  disabled?: boolean
  showFilenames?: boolean
  className?: string
  labels?: {
    addMore?: string
    edit?: string
    remove?: string
  }
}

const VideoIcon = () => (
  <svg className="sirv-staged-grid__placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
)

const Model3DIcon = () => (
  <svg className="sirv-staged-grid__placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
)

const PdfIcon = () => (
  <svg className="sirv-staged-grid__placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
)

const FileIcon = () => (
  <svg className="sirv-staged-grid__placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
)

const EditIcon = () => (
  <svg className="sirv-staged-grid__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

const RemoveIcon = () => (
  <svg className="sirv-staged-grid__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const PlusIcon = () => (
  <svg className="sirv-staged-grid__add-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

function getPlaceholderIcon(category?: FileCategory) {
  switch (category) {
    case 'video':
      return <VideoIcon />
    case '3d':
      return <Model3DIcon />
    case 'pdf':
      return <PdfIcon />
    default:
      return <FileIcon />
  }
}

export function StagedFilesGrid({
  files,
  onRemove,
  onEdit,
  onAddMore,
  maxFiles = 50,
  accept,
  disabled = false,
  showFilenames = true,
  className,
  labels = {},
}: StagedFilesGridProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAddMoreClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onAddMore || !e.target.files) return

      const newFiles: SirvFile[] = Array.from(e.target.files).map((file) => ({
        id: generateId(),
        file,
        filename: file.name,
        previewUrl: canPreviewFile(file) ? URL.createObjectURL(file) : '',
        size: file.size,
        status: 'pending' as const,
        progress: 0,
      }))

      onAddMore(newFiles)
      e.target.value = ''
    },
    [onAddMore]
  )

  const canAddMore = files.length < maxFiles && onAddMore

  return (
    <div className={clsx('sirv-staged-grid', className)}>
      <div className="sirv-staged-grid__items">
        {files.map((file) => {
          const hasPreview = !!file.previewUrl
          const canEditFile = onEdit && file.file && hasPreview

          return (
            <div
              key={file.id}
              className={clsx(
                'sirv-staged-grid__item',
                file.status === 'error' && 'sirv-staged-grid__item--error',
                file.status === 'uploading' && 'sirv-staged-grid__item--uploading',
                file.status === 'success' && 'sirv-staged-grid__item--success'
              )}
            >
              {/* Preview or placeholder */}
              <div className="sirv-staged-grid__preview">
                {hasPreview ? (
                  <img
                    src={file.previewUrl}
                    alt={file.filename}
                    className="sirv-staged-grid__image"
                  />
                ) : (
                  <div className="sirv-staged-grid__placeholder">
                    {getPlaceholderIcon(file.fileCategory)}
                  </div>
                )}

                {/* Hover overlay with actions */}
                {!disabled && (
                  <div className="sirv-staged-grid__overlay">
                    {canEditFile && (
                      <button
                        type="button"
                        className="sirv-staged-grid__action sirv-staged-grid__action--edit"
                        onClick={() => onEdit(file)}
                        title={labels.edit || 'Edit'}
                      >
                        <EditIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      className="sirv-staged-grid__action sirv-staged-grid__action--remove"
                      onClick={() => onRemove(file.id)}
                      title={labels.remove || 'Remove'}
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                )}

                {/* Progress indicator */}
                {file.status === 'uploading' && (
                  <div className="sirv-staged-grid__progress">
                    <div
                      className="sirv-staged-grid__progress-bar"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Success checkmark */}
                {file.status === 'success' && (
                  <div className="sirv-staged-grid__success-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Filename */}
              {showFilenames && (
                <div className="sirv-staged-grid__info">
                  <span className="sirv-staged-grid__filename" title={file.filename}>
                    {file.filename}
                  </span>
                  {file.size && (
                    <span className="sirv-staged-grid__size">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
              )}

              {/* Error message */}
              {file.error && (
                <div className="sirv-staged-grid__error" title={file.error}>
                  {file.error}
                </div>
              )}
            </div>
          )
        })}

        {/* Add more tile */}
        {canAddMore && (
          <button
            type="button"
            className="sirv-staged-grid__add-tile"
            onClick={handleAddMoreClick}
            disabled={disabled}
          >
            <PlusIcon />
            <span>{labels.addMore || 'Add more'}</span>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple
              onChange={handleFileChange}
              className="sirv-staged-grid__input"
            />
          </button>
        )}
      </div>
    </div>
  )
}
