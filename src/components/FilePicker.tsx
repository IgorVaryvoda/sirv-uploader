import { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'
import { formatFileSize } from '../utils/image-utils'
import type { BrowseItem, BrowseResponse } from '../types'

export interface FilePickerProps {
  endpoint: string
  isOpen: boolean
  onClose: () => void
  onSelect: (items: BrowseItem[]) => void
  fileType?: 'image' | 'video' | 'all'
  multiple?: boolean
  initialPath?: string
  className?: string
  labels?: {
    title?: string
    select?: string
    cancel?: string
    search?: string
    empty?: string
    loading?: string
    error?: string
  }
}

export function FilePicker({
  endpoint,
  isOpen,
  onClose,
  onSelect,
  fileType = 'image',
  multiple = false,
  initialPath = '/',
  className,
  labels = {},
}: FilePickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [items, setItems] = useState<BrowseItem[]>([])
  const [selectedItems, setSelectedItems] = useState<BrowseItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchItems = useCallback(
    async (path: string, search?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ path })
        if (fileType !== 'all') params.set('type', fileType)
        if (search) params.set('search', search)

        const response = await fetch(`${endpoint}/browse?${params}`)
        if (!response.ok) {
          throw new Error(`Failed to load files: ${response.status}`)
        }

        const data: BrowseResponse = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to load files')
        }

        setItems(data.items || [])
        setCurrentPath(data.path)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load files')
        setItems([])
      } finally {
        setIsLoading(false)
      }
    },
    [endpoint, fileType]
  )

  // Load initial path when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedItems([])
      setSearchQuery('')
      fetchItems(initialPath)
    }
  }, [isOpen, initialPath, fetchItems])

  // Debounced search
  useEffect(() => {
    if (!isOpen) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(currentPath, searchQuery || undefined)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, currentPath, isOpen, fetchItems])

  const handleNavigate = useCallback((path: string) => {
    setSearchQuery('')
    setCurrentPath(path)
  }, [])

  const handleGoUp = useCallback(() => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    handleNavigate(parentPath)
  }, [currentPath, handleNavigate])

  const handleItemClick = useCallback(
    (item: BrowseItem) => {
      if (item.type === 'folder') {
        handleNavigate(item.path)
        return
      }

      // File selection
      if (multiple) {
        setSelectedItems((prev) => {
          const isSelected = prev.some((i) => i.path === item.path)
          if (isSelected) {
            return prev.filter((i) => i.path !== item.path)
          }
          return [...prev, item]
        })
      } else {
        setSelectedItems([item])
      }
    },
    [multiple, handleNavigate]
  )

  const handleSelect = useCallback(() => {
    if (selectedItems.length > 0) {
      onSelect(selectedItems)
      onClose()
    }
  }, [selectedItems, onSelect, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  // Build breadcrumb parts
  const breadcrumbs = currentPath.split('/').filter(Boolean)

  if (!isOpen) return null

  return (
    <div
      className={clsx('sirv-filepicker-overlay', className)}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={labels.title || 'Select files from Sirv'}
    >
      <div className="sirv-filepicker" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sirv-filepicker__header">
          <h2 className="sirv-filepicker__title">{labels.title || 'Select from Sirv'}</h2>
          <button
            type="button"
            className="sirv-filepicker__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Breadcrumbs & Search */}
        <div className="sirv-filepicker__toolbar">
          <div className="sirv-filepicker__breadcrumbs">
            <button
              type="button"
              className="sirv-filepicker__breadcrumb"
              onClick={() => handleNavigate('/')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </button>
            {breadcrumbs.map((part, index) => (
              <span key={index}>
                <span className="sirv-filepicker__breadcrumb-separator">/</span>
                <button
                  type="button"
                  className="sirv-filepicker__breadcrumb"
                  onClick={() => handleNavigate('/' + breadcrumbs.slice(0, index + 1).join('/'))}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>

          <div className="sirv-filepicker__search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.search || 'Search...'}
              className="sirv-filepicker__search-input"
            />
          </div>
        </div>

        {/* Content */}
        <div className="sirv-filepicker__content">
          {isLoading ? (
            <div className="sirv-filepicker__loading">
              <div className="sirv-filepicker__spinner" />
              <p>{labels.loading || 'Loading...'}</p>
            </div>
          ) : error ? (
            <div className="sirv-filepicker__error">
              <p>{error}</p>
              <button type="button" onClick={() => fetchItems(currentPath)}>
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="sirv-filepicker__empty">
              <p>{labels.empty || 'No files found'}</p>
            </div>
          ) : (
            <div className="sirv-filepicker__grid">
              {/* Up button */}
              {currentPath !== '/' && (
                <button
                  type="button"
                  className="sirv-filepicker__item sirv-filepicker__item--folder"
                  onClick={handleGoUp}
                >
                  <div className="sirv-filepicker__item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </div>
                  <div className="sirv-filepicker__item-name">..</div>
                </button>
              )}

              {/* Items */}
              {items.map((item) => {
                const isSelected = selectedItems.some((i) => i.path === item.path)
                return (
                  <button
                    type="button"
                    key={item.path}
                    className={clsx(
                      'sirv-filepicker__item',
                      `sirv-filepicker__item--${item.type}`,
                      isSelected && 'sirv-filepicker__item--selected'
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.type === 'folder' ? (
                      <div className="sirv-filepicker__item-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                    ) : item.thumbnail ? (
                      <div className="sirv-filepicker__item-thumbnail">
                        <img src={item.thumbnail} alt="" />
                      </div>
                    ) : (
                      <div className="sirv-filepicker__item-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                    <div className="sirv-filepicker__item-name" title={item.name}>
                      {item.name}
                    </div>
                    {item.size && (
                      <div className="sirv-filepicker__item-size">{formatFileSize(item.size)}</div>
                    )}
                    {isSelected && (
                      <div className="sirv-filepicker__item-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sirv-filepicker__footer">
          <span className="sirv-filepicker__selection-count">
            {selectedItems.length > 0
              ? `${selectedItems.length} file${selectedItems.length !== 1 ? 's' : ''} selected`
              : 'No files selected'}
          </span>
          <div className="sirv-filepicker__actions">
            <button type="button" className="sirv-filepicker__btn" onClick={onClose}>
              {labels.cancel || 'Cancel'}
            </button>
            <button
              type="button"
              className="sirv-filepicker__btn sirv-filepicker__btn--primary"
              onClick={handleSelect}
              disabled={selectedItems.length === 0}
            >
              {labels.select || 'Select'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
