import { useState, useCallback, useRef, useEffect } from 'react'

export type AspectRatio = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16'

export interface CropArea {
  x: number // Percentage (0-1)
  y: number // Percentage (0-1)
  width: number // Percentage (0-1)
  height: number // Percentage (0-1)
}

export interface EditorState {
  rotation: 0 | 90 | 180 | 270
  flipH: boolean
  flipV: boolean
  crop: CropArea | null
  zoom: number
}

export interface UseImageEditorOptions {
  file: File
  previewUrl: string
  onApply: (editedFile: File, previewUrl: string) => void
  onCancel: () => void
  maxCanvasSize?: number
}

export interface UseImageEditorReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  state: EditorState
  isLoading: boolean
  imageLoaded: boolean
  canvasSize: { width: number; height: number }
  imageSize: { width: number; height: number }
  hasChanges: boolean
  isApplying: boolean
  aspectRatio: AspectRatio

  // Actions
  rotateLeft: () => void
  rotateRight: () => void
  flipHorizontal: () => void
  flipVertical: () => void
  setCrop: (crop: CropArea | null) => void
  setAspectRatio: (ratio: AspectRatio) => void
  setZoom: (zoom: number) => void
  reset: () => void
  apply: () => Promise<void>
}

const DEFAULT_STATE: EditorState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: null,
  zoom: 1,
}

const MAX_CANVAS_SIZE = 800

export function useImageEditor({
  file,
  previewUrl,
  onApply,
  onCancel,
  maxCanvasSize = MAX_CANVAS_SIZE,
}: UseImageEditorOptions): UseImageEditorReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [state, setState] = useState<EditorState>(DEFAULT_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Load image on mount
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })

      // Calculate canvas size (fit to max size while maintaining aspect ratio)
      const scale = Math.min(
        maxCanvasSize / img.naturalWidth,
        maxCanvasSize / img.naturalHeight,
        1
      )
      setCanvasSize({
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      })

      setImageLoaded(true)
      setIsLoading(false)
    }
    img.onerror = () => {
      setIsLoading(false)
      console.error('Failed to load image for editing')
    }
    img.src = previewUrl
  }, [previewUrl, maxCanvasSize])

  // Render canvas whenever state changes
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current

    // Determine canvas dimensions based on rotation
    const isRotated90or270 = state.rotation === 90 || state.rotation === 270
    let canvasWidth = canvasSize.width
    let canvasHeight = canvasSize.height

    if (isRotated90or270) {
      // Swap dimensions when rotated 90 or 270
      const scale = Math.min(
        maxCanvasSize / img.naturalHeight,
        maxCanvasSize / img.naturalWidth,
        1
      )
      canvasWidth = Math.round(img.naturalHeight * scale)
      canvasHeight = Math.round(img.naturalWidth * scale)
    }

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()

    // Move to center
    ctx.translate(canvas.width / 2, canvas.height / 2)

    // Apply rotation
    ctx.rotate((state.rotation * Math.PI) / 180)

    // Apply flips
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1)

    // Draw image centered
    const drawWidth = isRotated90or270 ? canvasHeight : canvasWidth
    const drawHeight = isRotated90or270 ? canvasWidth : canvasHeight
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)

    ctx.restore()
  }, [state, imageLoaded, canvasSize, maxCanvasSize])

  const hasChanges =
    state.rotation !== 0 ||
    state.flipH ||
    state.flipV ||
    state.crop !== null ||
    state.zoom !== 1

  const rotateLeft = useCallback(() => {
    setState((prev) => ({
      ...prev,
      rotation: ((prev.rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270,
    }))
  }, [])

  const rotateRight = useCallback(() => {
    setState((prev) => ({
      ...prev,
      rotation: ((prev.rotation + 90) % 360) as 0 | 90 | 180 | 270,
    }))
  }, [])

  const flipHorizontal = useCallback(() => {
    setState((prev) => ({ ...prev, flipH: !prev.flipH }))
  }, [])

  const flipVertical = useCallback(() => {
    setState((prev) => ({ ...prev, flipV: !prev.flipV }))
  }, [])

  const setCrop = useCallback((crop: CropArea | null) => {
    setState((prev) => ({ ...prev, crop }))
  }, [])

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(1, Math.min(5, zoom)) }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
    setAspectRatio('free')
  }, [])

  const apply = useCallback(async () => {
    if (!imageRef.current) return

    setIsApplying(true)

    try {
      const img = imageRef.current

      // Create output canvas at original resolution (or cropped size)
      const outputCanvas = document.createElement('canvas')
      const outputCtx = outputCanvas.getContext('2d')
      if (!outputCtx) throw new Error('Failed to get canvas context')

      // Calculate output dimensions
      const isRotated90or270 = state.rotation === 90 || state.rotation === 270
      let outputWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth
      let outputHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight

      // Apply crop if set
      let cropX = 0,
        cropY = 0,
        cropWidth = outputWidth,
        cropHeight = outputHeight

      if (state.crop) {
        cropX = Math.round(state.crop.x * outputWidth)
        cropY = Math.round(state.crop.y * outputHeight)
        cropWidth = Math.round(state.crop.width * outputWidth)
        cropHeight = Math.round(state.crop.height * outputHeight)
        outputWidth = cropWidth
        outputHeight = cropHeight
      }

      outputCanvas.width = outputWidth
      outputCanvas.height = outputHeight

      // First, create a temp canvas with transformations applied
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) throw new Error('Failed to get temp canvas context')

      const tempWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth
      const tempHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight
      tempCanvas.width = tempWidth
      tempCanvas.height = tempHeight

      tempCtx.save()
      tempCtx.translate(tempWidth / 2, tempHeight / 2)
      tempCtx.rotate((state.rotation * Math.PI) / 180)
      tempCtx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1)

      const drawWidth = isRotated90or270 ? tempHeight : tempWidth
      const drawHeight = isRotated90or270 ? tempWidth : tempHeight
      tempCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      tempCtx.restore()

      // Now crop from temp canvas to output canvas
      if (state.crop) {
        outputCtx.drawImage(
          tempCanvas,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputWidth,
          outputHeight
        )
      } else {
        outputCtx.drawImage(tempCanvas, 0, 0)
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create blob'))
          },
          file.type || 'image/png',
          0.92
        )
      })

      // Create new File
      const editedFile = new File([blob], file.name, {
        type: file.type || 'image/png',
        lastModified: Date.now(),
      })

      // Create preview URL
      const editedPreviewUrl = URL.createObjectURL(blob)

      onApply(editedFile, editedPreviewUrl)
    } catch (error) {
      console.error('Failed to apply edits:', error)
    } finally {
      setIsApplying(false)
    }
  }, [state, file, onApply])

  return {
    canvasRef,
    state,
    isLoading,
    imageLoaded,
    canvasSize,
    imageSize,
    hasChanges,
    isApplying,
    aspectRatio,
    rotateLeft,
    rotateRight,
    flipHorizontal,
    flipVertical,
    setCrop,
    setAspectRatio,
    setZoom,
    reset,
    apply,
  }
}
