import { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react'
import clsx from 'clsx'
import { useImageEditor, type AspectRatio, type CropArea } from '../hooks/useImageEditor'
import {
  RotateLeftIcon,
  RotateRightIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  CropIcon,
  TransformIcon,
  CloseIcon,
  SpinnerIcon,
} from './icons'

export interface ImageEditorProps {
  file: File
  previewUrl: string
  onApply: (editedFile: File, previewUrl: string) => void
  onCancel: () => void
  labels?: {
    title?: string
    apply?: string
    cancel?: string
    reset?: string
    rotateLeft?: string
    rotateRight?: string
    flipHorizontal?: string
    flipVertical?: string
    crop?: string
    transform?: string
    aspectRatio?: string
    aspectFree?: string
  }
}

type EditorMode = 'transform' | 'crop'

const ASPECT_RATIOS: { value: AspectRatio; label: string; ratio: number | null }[] = [
  { value: 'free', label: 'Free', ratio: null },
  { value: '1:1', label: '1:1', ratio: 1 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '3:4', label: '3:4', ratio: 3 / 4 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
  { value: '9:16', label: '9:16', ratio: 9 / 16 },
]

interface CropOverlayProps {
  canvasWidth: number
  canvasHeight: number
  crop: CropArea | null
  onCropChange: (crop: CropArea | null) => void
  aspectRatio: AspectRatio
  disabled?: boolean
}

const CropOverlay = memo(function CropOverlay({
  canvasWidth,
  canvasHeight,
  crop,
  onCropChange,
  aspectRatio,
  disabled,
}: CropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialCrop, setInitialCrop] = useState<CropArea | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)

  // Initialize crop if not set
  useEffect(() => {
    if (!crop) {
      const ratioConfig = ASPECT_RATIOS.find((r) => r.value === aspectRatio)
      const ratio = ratioConfig?.ratio

      let width = 0.8
      let height = 0.8

      if (ratio) {
        const canvasRatio = canvasWidth / canvasHeight
        if (ratio > canvasRatio) {
          width = 0.8
          height = (width * canvasWidth) / (ratio * canvasHeight)
        } else {
          height = 0.8
          width = (height * canvasHeight * ratio) / canvasWidth
        }
      }

      const x = (1 - width) / 2
      const y = (1 - height) / 2

      onCropChange({ x, y, width, height })
    }
  }, [crop, aspectRatio, canvasWidth, canvasHeight, onCropChange])

  const getMousePosition = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!overlayRef.current) return { x: 0, y: 0 }
      const rect = overlayRef.current.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | 'resize', handle?: string) => {
      if (disabled || !crop) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      setDragType(type)
      setDragStart(getMousePosition(e))
      setInitialCrop({ ...crop })
      if (handle) setResizeHandle(handle)
    },
    [disabled, crop, getMousePosition]
  )

  useEffect(() => {
    if (!isDragging || !initialCrop) return

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getMousePosition(e)
      const dx = pos.x - dragStart.x
      const dy = pos.y - dragStart.y

      if (dragType === 'move') {
        const newX = Math.max(0, Math.min(1 - initialCrop.width, initialCrop.x + dx))
        const newY = Math.max(0, Math.min(1 - initialCrop.height, initialCrop.y + dy))
        onCropChange({ ...initialCrop, x: newX, y: newY })
      } else if (dragType === 'resize' && resizeHandle) {
        let newCrop = { ...initialCrop }
        const ratioConfig = ASPECT_RATIOS.find((r) => r.value === aspectRatio)
        const ratio = ratioConfig?.ratio

        // Handle resize based on which handle was grabbed
        if (resizeHandle.includes('e')) {
          newCrop.width = Math.max(0.1, Math.min(1 - initialCrop.x, initialCrop.width + dx))
        }
        if (resizeHandle.includes('w')) {
          const newWidth = Math.max(0.1, Math.min(initialCrop.x + initialCrop.width, initialCrop.width - dx))
          const newX = initialCrop.x + initialCrop.width - newWidth
          newCrop.x = Math.max(0, newX)
          newCrop.width = newWidth
        }
        if (resizeHandle.includes('s')) {
          newCrop.height = Math.max(0.1, Math.min(1 - initialCrop.y, initialCrop.height + dy))
        }
        if (resizeHandle.includes('n')) {
          const newHeight = Math.max(0.1, Math.min(initialCrop.y + initialCrop.height, initialCrop.height - dy))
          const newY = initialCrop.y + initialCrop.height - newHeight
          newCrop.y = Math.max(0, newY)
          newCrop.height = newHeight
        }

        // Enforce aspect ratio if set
        if (ratio) {
          const cropWidthPx = newCrop.width * canvasWidth
          const cropHeightPx = newCrop.height * canvasHeight
          const currentRatio = cropWidthPx / cropHeightPx

          if (currentRatio > ratio) {
            // Too wide, adjust width
            newCrop.width = (newCrop.height * canvasHeight * ratio) / canvasWidth
          } else {
            // Too tall, adjust height
            newCrop.height = (newCrop.width * canvasWidth) / (ratio * canvasHeight)
          }

          // Keep within bounds
          if (newCrop.x + newCrop.width > 1) {
            newCrop.x = 1 - newCrop.width
          }
          if (newCrop.y + newCrop.height > 1) {
            newCrop.y = 1 - newCrop.height
          }
        }

        onCropChange(newCrop)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDragType(null)
      setResizeHandle(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragType, dragStart, initialCrop, resizeHandle, aspectRatio, canvasWidth, canvasHeight, getMousePosition, onCropChange])

  if (!crop) return null

  const style = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.width * 100}%`,
    height: `${crop.height * 100}%`,
  }

  return (
    <div ref={overlayRef} className="sirv-editor__crop-overlay">
      {/* Darkened areas */}
      <div className="sirv-editor__crop-mask" />

      {/* Crop box */}
      <div
        className={clsx('sirv-editor__crop-box', isDragging && 'sirv-editor__crop-box--dragging')}
        style={style}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Grid lines */}
        <div className="sirv-editor__crop-grid">
          <div className="sirv-editor__crop-grid-line sirv-editor__crop-grid-line--h1" />
          <div className="sirv-editor__crop-grid-line sirv-editor__crop-grid-line--h2" />
          <div className="sirv-editor__crop-grid-line sirv-editor__crop-grid-line--v1" />
          <div className="sirv-editor__crop-grid-line sirv-editor__crop-grid-line--v2" />
        </div>

        {/* Resize handles */}
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--n" onMouseDown={(e) => handleMouseDown(e, 'resize', 'n')} />
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--s" onMouseDown={(e) => handleMouseDown(e, 'resize', 's')} />
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--e" onMouseDown={(e) => handleMouseDown(e, 'resize', 'e')} />
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--w" onMouseDown={(e) => handleMouseDown(e, 'resize', 'w')} />
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--ne" onMouseDown={(e) => handleMouseDown(e, 'resize', 'ne')} />
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--nw" onMouseDown={(e) => handleMouseDown(e, 'resize', 'nw')} />
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--se" onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')} />
        <div className="sirv-editor__crop-handle sirv-editor__crop-handle--sw" onMouseDown={(e) => handleMouseDown(e, 'resize', 'sw')} />
      </div>
    </div>
  )
})

// Default labels extracted to avoid object recreation
const DEFAULT_EDITOR_LABELS = {
  title: 'Edit Image',
  apply: 'Apply',
  cancel: 'Cancel',
  reset: 'Reset',
  rotateLeft: 'Rotate Left',
  rotateRight: 'Rotate Right',
  flipHorizontal: 'Flip Horizontal',
  flipVertical: 'Flip Vertical',
  crop: 'Crop',
  transform: 'Transform',
  aspectRatio: 'Aspect Ratio',
  aspectFree: 'Free',
}

export function ImageEditor({
  file,
  previewUrl,
  onApply,
  onCancel,
  labels = {},
}: ImageEditorProps) {
  const [mode, setMode] = useState<EditorMode>('transform')

  const editor = useImageEditor({
    file,
    previewUrl,
    onApply,
    onCancel,
  })

  // Memoize merged labels to prevent child re-renders
  const l = useMemo(() => ({ ...DEFAULT_EDITOR_LABELS, ...labels }), [labels])

  const handleModeChange = useCallback(
    (newMode: EditorMode) => {
      if (newMode === 'crop' && !editor.state.crop) {
        // Initialize crop when entering crop mode
        editor.setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 })
      }
      if (mode === 'crop' && newMode !== 'crop') {
        // Clear crop when leaving crop mode
        editor.setCrop(null)
      }
      setMode(newMode)
    },
    [editor, mode]
  )

  const handleClearCrop = useCallback(() => {
    editor.setCrop(null)
  }, [editor])

  const isProcessing = editor.isLoading || editor.isApplying

  return (
    <div className="sirv-editor-overlay" onClick={onCancel}>
      <div className="sirv-editor" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sirv-editor__header">
          <h2 className="sirv-editor__title">{l.title}</h2>
          <div className="sirv-editor__header-actions">
            <button
              type="button"
              className="sirv-editor__header-btn"
              onClick={editor.reset}
              disabled={!editor.hasChanges}
            >
              {l.reset}
            </button>
            <button
              type="button"
              className="sirv-editor__close"
              onClick={onCancel}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="sirv-editor__tabs">
          <button
            type="button"
            className={clsx('sirv-editor__tab', mode === 'transform' && 'sirv-editor__tab--active')}
            onClick={() => handleModeChange('transform')}
            disabled={isProcessing}
          >
            <TransformIcon />
            {l.transform}
          </button>
          <button
            type="button"
            className={clsx('sirv-editor__tab', mode === 'crop' && 'sirv-editor__tab--active')}
            onClick={() => handleModeChange('crop')}
            disabled={isProcessing}
          >
            <CropIcon />
            {l.crop}
          </button>
        </div>

        {/* Canvas area */}
        <div className="sirv-editor__canvas-area">
          {editor.isLoading ? (
            <div className="sirv-editor__loading">
              <SpinnerIcon />
              <span>Loading...</span>
            </div>
          ) : (
            <div className="sirv-editor__canvas-wrapper">
              <canvas
                ref={editor.canvasRef}
                className="sirv-editor__canvas"
              />
              {mode === 'crop' && editor.imageLoaded && (
                <CropOverlay
                  canvasWidth={editor.canvasSize.width}
                  canvasHeight={editor.canvasSize.height}
                  crop={editor.state.crop}
                  onCropChange={editor.setCrop}
                  aspectRatio={editor.aspectRatio}
                  disabled={isProcessing}
                />
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="sirv-editor__controls">
          {mode === 'transform' && (
            <div className="sirv-editor__transform-controls">
              <button
                type="button"
                className="sirv-editor__control-btn"
                onClick={editor.rotateLeft}
                disabled={isProcessing}
                title={l.rotateLeft}
              >
                <RotateLeftIcon />
              </button>
              <button
                type="button"
                className="sirv-editor__control-btn"
                onClick={editor.rotateRight}
                disabled={isProcessing}
                title={l.rotateRight}
              >
                <RotateRightIcon />
              </button>
              <div className="sirv-editor__control-divider" />
              <button
                type="button"
                className={clsx('sirv-editor__control-btn', editor.state.flipH && 'sirv-editor__control-btn--active')}
                onClick={editor.flipHorizontal}
                disabled={isProcessing}
                title={l.flipHorizontal}
              >
                <FlipHorizontalIcon />
              </button>
              <button
                type="button"
                className={clsx('sirv-editor__control-btn', editor.state.flipV && 'sirv-editor__control-btn--active')}
                onClick={editor.flipVertical}
                disabled={isProcessing}
                title={l.flipVertical}
              >
                <FlipVerticalIcon />
              </button>
            </div>
          )}

          {mode === 'crop' && (
            <div className="sirv-editor__crop-controls">
              <label className="sirv-editor__control-label">{l.aspectRatio}:</label>
              <div className="sirv-editor__aspect-buttons">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    className={clsx(
                      'sirv-editor__aspect-btn',
                      editor.aspectRatio === ratio.value && 'sirv-editor__aspect-btn--active'
                    )}
                    onClick={() => {
                      editor.setAspectRatio(ratio.value)
                      // Reset crop when changing aspect ratio
                      editor.setCrop(null)
                    }}
                    disabled={isProcessing}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
              {editor.state.crop && (
                <button
                  type="button"
                  className="sirv-editor__clear-crop"
                  onClick={handleClearCrop}
                  disabled={isProcessing}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sirv-editor__footer">
          <button
            type="button"
            className="sirv-btn"
            onClick={onCancel}
          >
            {l.cancel}
          </button>
          <button
            type="button"
            className="sirv-btn sirv-btn--primary"
            onClick={editor.apply}
            disabled={isProcessing || !editor.hasChanges}
          >
            {editor.isApplying ? (
              <>
                <SpinnerIcon />
                Applying...
              </>
            ) : (
              l.apply
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
