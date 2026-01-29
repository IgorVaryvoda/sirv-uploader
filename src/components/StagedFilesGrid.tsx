import { useState, useCallback, useRef, memo, useMemo } from 'react'
import clsx from 'clsx'
import { formatFileSize, generateId, canPreviewFile, getFileCategory } from '../utils/image-utils'
import { ImageEditor } from './ImageEditor'
import {
  VideoIcon,
  Model3DIcon,
  PdfIcon,
  SpreadsheetIcon,
  PresentationIcon,
  DocumentIcon,
  FileIcon,
  EditIcon,
  RemoveIcon,
  PlusIcon,
  CheckIcon,
} from './icons'
import type { SirvFile, FileCategory } from '../types'

export interface StagedFilesGridProps {
  files: SirvFile[]
  onRemove: (id: string) => void
  onEdit?: (file: SirvFile) => void
  onFileEdited?: (id: string, editedFile: File, previewUrl: string) => void
  onAddMore?: (files: SirvFile[]) => void
  maxFiles?: number
  accept?: string
  disabled?: boolean
  showFilenames?: boolean
  enableEditor?: boolean
  className?: string
  labels?: {
    addMore?: string
    edit?: string
    remove?: string
  }
}

// File extension to icon mapping
const SPREADSHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers'])
const PRESENTATION_EXTENSIONS = new Set(['ppt', 'pptx', 'odp', 'key'])
const DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'odt', 'rtf', 'txt', 'pages'])

function getPlaceholderIcon(category?: FileCategory, filename?: string) {
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext) {
      if (SPREADSHEET_EXTENSIONS.has(ext)) return <SpreadsheetIcon />
      if (PRESENTATION_EXTENSIONS.has(ext)) return <PresentationIcon />
      if (DOCUMENT_EXTENSIONS.has(ext)) return <DocumentIcon />
    }
  }

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

// Memoized file item to prevent unnecessary re-renders
interface FileItemProps {
  file: SirvFile
  disabled: boolean
  showFilenames: boolean
  canEdit: boolean
  onRemove: (id: string) => void
  onEdit: (file: SirvFile) => void
  labels: { edit?: string; remove?: string }
}

const FileItem = memo(function FileItem({
  file,
  disabled,
  showFilenames,
  canEdit,
  onRemove,
  onEdit,
  labels,
}: FileItemProps) {
  const hasPreview = !!file.previewUrl

  const handleRemove = useCallback(() => {
    onRemove(file.id)
  }, [onRemove, file.id])

  const handleEdit = useCallback(() => {
    onEdit(file)
  }, [onEdit, file])

  return (
    <div
      className={clsx(
        'sirv-staged-grid__item',
        file.status === 'error' && 'sirv-staged-grid__item--error',
        file.status === 'uploading' && 'sirv-staged-grid__item--uploading',
        file.status === 'success' && 'sirv-staged-grid__item--success'
      )}
    >
      <div className="sirv-staged-grid__preview">
        {hasPreview ? (
          <img
            src={file.previewUrl}
            alt={file.filename}
            className="sirv-staged-grid__image"
          />
        ) : (
          <div className="sirv-staged-grid__placeholder">
            {getPlaceholderIcon(file.fileCategory, file.filename)}
          </div>
        )}

        {!disabled && (
          <div className="sirv-staged-grid__overlay">
            {canEdit && (
              <button
                type="button"
                className="sirv-staged-grid__action sirv-staged-grid__action--edit"
                onClick={handleEdit}
                title={labels.edit || 'Edit'}
              >
                <EditIcon />
              </button>
            )}
            <button
              type="button"
              className="sirv-staged-grid__action sirv-staged-grid__action--remove"
              onClick={handleRemove}
              title={labels.remove || 'Remove'}
            >
              <RemoveIcon />
            </button>
          </div>
        )}

        {file.status === 'uploading' && (
          <div className="sirv-staged-grid__progress">
            <div
              className="sirv-staged-grid__progress-bar"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}

        {file.status === 'success' && (
          <div className="sirv-staged-grid__success-badge">
            <CheckIcon />
          </div>
        )}
      </div>

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

      {file.error && (
        <div className="sirv-staged-grid__error" title={file.error}>
          {file.error}
        </div>
      )}
    </div>
  )
})

export function StagedFilesGrid({
  files,
  onRemove,
  onEdit,
  onFileEdited,
  onAddMore,
  maxFiles = 50,
  accept,
  disabled = false,
  showFilenames = true,
  enableEditor = false,
  className,
  labels = {},
}: StagedFilesGridProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editingFile, setEditingFile] = useState<SirvFile | null>(null)

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
        fileCategory: getFileCategory(file),
        status: 'pending' as const,
        progress: 0,
      }))

      onAddMore(newFiles)
      e.target.value = ''
    },
    [onAddMore]
  )

  const handleEditClick = useCallback(
    (file: SirvFile) => {
      if (enableEditor && file.file && file.previewUrl) {
        setEditingFile(file)
      } else if (onEdit) {
        onEdit(file)
      }
    },
    [enableEditor, onEdit]
  )

  const handleEditorApply = useCallback(
    (editedFile: File, previewUrl: string) => {
      if (!editingFile) return

      if (editingFile.previewUrl) {
        URL.revokeObjectURL(editingFile.previewUrl)
      }

      if (onFileEdited) {
        onFileEdited(editingFile.id, editedFile, previewUrl)
      }

      setEditingFile(null)
    },
    [editingFile, onFileEdited]
  )

  const handleEditorCancel = useCallback(() => {
    setEditingFile(null)
  }, [])

  const canAddMore = files.length < maxFiles && onAddMore

  // Memoize labels to prevent unnecessary re-renders of FileItem
  const itemLabels = useMemo(() => ({ edit: labels.edit, remove: labels.remove }), [labels.edit, labels.remove])

  return (
    <div className={clsx('sirv-staged-grid', className)}>
      <div className="sirv-staged-grid__items">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            disabled={disabled}
            showFilenames={showFilenames}
            canEdit={!!(onEdit || enableEditor) && !!file.file && !!file.previewUrl}
            onRemove={onRemove}
            onEdit={handleEditClick}
            labels={itemLabels}
          />
        ))}

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

      {editingFile && editingFile.file && editingFile.previewUrl && (
        <ImageEditor
          file={editingFile.file}
          previewUrl={editingFile.previewUrl}
          onApply={handleEditorApply}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  )
}
