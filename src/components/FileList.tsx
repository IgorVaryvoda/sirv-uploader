import clsx from 'clsx'
import { formatFileSize } from '../utils/image-utils'
import type { SirvFile } from '../types'

export interface FileListProps {
  files: SirvFile[]
  onRemove?: (id: string) => void
  onRetry?: (id: string) => void
  showThumbnails?: boolean
  className?: string
  labels?: {
    retry?: string
    remove?: string
    uploading?: string
    processing?: string
    success?: string
    error?: string
  }
}

export function FileList({
  files,
  onRemove,
  onRetry,
  showThumbnails = true,
  className,
  labels = {},
}: FileListProps) {
  if (files.length === 0) return null

  return (
    <div className={clsx('sirv-filelist', className)}>
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          onRemove={onRemove}
          onRetry={onRetry}
          showThumbnail={showThumbnails}
          labels={labels}
        />
      ))}
    </div>
  )
}

interface FileItemProps {
  file: SirvFile
  onRemove?: (id: string) => void
  onRetry?: (id: string) => void
  showThumbnail?: boolean
  labels: FileListProps['labels']
}

function FileItem({ file, onRemove, onRetry, showThumbnail, labels = {} }: FileItemProps) {
  const statusText = {
    pending: '',
    uploading: labels.uploading || 'Uploading...',
    processing: labels.processing || 'Processing...',
    success: labels.success || 'Uploaded',
    error: labels.error || 'Failed',
    conflict: 'Conflict',
  }

  return (
    <div
      className={clsx(
        'sirv-filelist__item',
        `sirv-filelist__item--${file.status}`,
        file.error && 'sirv-filelist__item--has-error'
      )}
    >
      {showThumbnail && file.previewUrl && (
        <div className="sirv-filelist__thumbnail">
          <img src={file.previewUrl} alt="" />
        </div>
      )}

      <div className="sirv-filelist__info">
        <div className="sirv-filelist__name" title={file.filename}>
          {file.filename}
        </div>
        <div className="sirv-filelist__meta">
          {file.size && <span className="sirv-filelist__size">{formatFileSize(file.size)}</span>}
          {file.dimensions && (
            <span className="sirv-filelist__dimensions">
              {file.dimensions.width} × {file.dimensions.height}
            </span>
          )}
          {file.status !== 'pending' && (
            <span className={`sirv-filelist__status sirv-filelist__status--${file.status}`}>
              {statusText[file.status]}
            </span>
          )}
        </div>
        {file.error && <div className="sirv-filelist__error">{file.error}</div>}
      </div>

      {/* Progress bar */}
      {(file.status === 'uploading' || file.status === 'processing') && (
        <div className="sirv-filelist__progress">
          <div
            className="sirv-filelist__progress-bar"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="sirv-filelist__actions">
        {file.status === 'error' && onRetry && (
          <button
            type="button"
            className="sirv-filelist__action sirv-filelist__action--retry"
            onClick={() => onRetry(file.id)}
            aria-label={labels.retry || 'Retry upload'}
            title={labels.retry || 'Retry'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}
        {onRemove && file.status !== 'uploading' && (
          <button
            type="button"
            className="sirv-filelist__action sirv-filelist__action--remove"
            onClick={() => onRemove(file.id)}
            aria-label={labels.remove || 'Remove file'}
            title={labels.remove || 'Remove'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {file.status === 'success' && (
          <span className="sirv-filelist__check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </div>
    </div>
  )
}

export interface FileListSummaryProps {
  files: SirvFile[]
  className?: string
}

export function FileListSummary({ files, className }: FileListSummaryProps) {
  const pending = files.filter((f) => f.status === 'pending').length
  const uploading = files.filter((f) => f.status === 'uploading' || f.status === 'processing').length
  const success = files.filter((f) => f.status === 'success').length
  const error = files.filter((f) => f.status === 'error').length

  if (files.length === 0) return null

  return (
    <div className={clsx('sirv-filelist-summary', className)}>
      <span className="sirv-filelist-summary__total">{files.length} files</span>
      {pending > 0 && <span className="sirv-filelist-summary__pending">{pending} pending</span>}
      {uploading > 0 && (
        <span className="sirv-filelist-summary__uploading">{uploading} uploading</span>
      )}
      {success > 0 && <span className="sirv-filelist-summary__success">{success} uploaded</span>}
      {error > 0 && <span className="sirv-filelist-summary__error">{error} failed</span>}
    </div>
  )
}
