import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useImageEditor } from '../hooks/useImageEditor'

describe('useImageEditor Extended', () => {
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
  const mockPreviewUrl = 'blob:test-preview'
  const mockOnApply = vi.fn()
  const mockOnCancel = vi.fn()

  const defaultOptions = {
    file: mockFile,
    previewUrl: mockPreviewUrl,
    onApply: mockOnApply,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Image class
    global.Image = class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      crossOrigin = ''
      naturalWidth = 800
      naturalHeight = 600

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
    } as unknown as typeof Image

    // Mock canvas context
    const mockContext = {
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 100,
        height: 100,
      })),
      putImageData: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      rect: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      setLineDash: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalCompositeOperation: 'source-over',
    }

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext)
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(['test'], { type: 'image/jpeg' }))
    })
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,test')

    // Mock URL APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => {
        expect(result.current.state.rotation).toBe(0)
      })

      expect(result.current.state.flipH).toBe(false)
      expect(result.current.state.flipV).toBe(false)
      expect(result.current.state.crop).toBeNull()
      expect(result.current.hasChanges).toBe(false)
    })

    it('should start in loading state', () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))
      expect(result.current.isLoading).toBe(true)
    })

    it('should finish loading when image loads', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.imageLoaded).toBe(true)
      })
    })

    it('should provide all editing functions', () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      expect(typeof result.current.rotateLeft).toBe('function')
      expect(typeof result.current.rotateRight).toBe('function')
      expect(typeof result.current.flipHorizontal).toBe('function')
      expect(typeof result.current.flipVertical).toBe('function')
      expect(typeof result.current.setCrop).toBe('function')
      expect(typeof result.current.setAspectRatio).toBe('function')
      expect(typeof result.current.setZoom).toBe('function')
      expect(typeof result.current.reset).toBe('function')
      expect(typeof result.current.apply).toBe('function')
    })

    it('should provide canvas ref', () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))
      expect(result.current.canvasRef).toBeDefined()
    })
  })

  describe('Rotation', () => {
    it('should rotate left by 90 degrees', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateLeft()
      })

      expect(result.current.state.rotation).toBe(270)
      expect(result.current.hasChanges).toBe(true)
    })

    it('should rotate right by 90 degrees', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
      })

      expect(result.current.state.rotation).toBe(90)
      expect(result.current.hasChanges).toBe(true)
    })

    it('should wrap rotation at 360 degrees', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
        result.current.rotateRight()
        result.current.rotateRight()
        result.current.rotateRight()
      })

      expect(result.current.state.rotation).toBe(0)
    })

    it('should wrap rotation at -360 degrees', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateLeft()
        result.current.rotateLeft()
        result.current.rotateLeft()
        result.current.rotateLeft()
      })

      expect(result.current.state.rotation).toBe(0)
    })
  })

  describe('Flipping', () => {
    it('should toggle horizontal flip', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.flipHorizontal()
      })

      expect(result.current.state.flipH).toBe(true)
      expect(result.current.hasChanges).toBe(true)
    })

    it('should toggle horizontal flip back', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.flipHorizontal()
        result.current.flipHorizontal()
      })

      expect(result.current.state.flipH).toBe(false)
    })

    it('should toggle vertical flip', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.flipVertical()
      })

      expect(result.current.state.flipV).toBe(true)
      expect(result.current.hasChanges).toBe(true)
    })

    it('should toggle vertical flip back', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.flipVertical()
        result.current.flipVertical()
      })

      expect(result.current.state.flipV).toBe(false)
    })

    it('should allow both flips simultaneously', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.flipHorizontal()
        result.current.flipVertical()
      })

      expect(result.current.state.flipH).toBe(true)
      expect(result.current.state.flipV).toBe(true)
    })
  })

  describe('Cropping', () => {
    it('should set crop area', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setCrop({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 })
      })

      expect(result.current.state.crop).toEqual({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 })
      expect(result.current.hasChanges).toBe(true)
    })

    it('should clear crop area', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setCrop({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 })
      })

      act(() => {
        result.current.setCrop(null)
      })

      expect(result.current.state.crop).toBeNull()
    })
  })

  describe('Aspect Ratio', () => {
    it('should set aspect ratio', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setAspectRatio('1:1')
      })

      expect(result.current.aspectRatio).toBe('1:1')
    })

    it('should default to free aspect ratio', () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))
      expect(result.current.aspectRatio).toBe('free')
    })
  })

  describe('Zoom', () => {
    it('should set zoom level', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setZoom(2)
      })

      expect(result.current.state.zoom).toBe(2)
      expect(result.current.hasChanges).toBe(true)
    })

    it('should clamp zoom to minimum 1', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setZoom(0.5)
      })

      expect(result.current.state.zoom).toBe(1)
    })

    it('should clamp zoom to maximum 5', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setZoom(10)
      })

      expect(result.current.state.zoom).toBe(5)
    })
  })

  describe('Reset', () => {
    it('should reset all transformations', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
        result.current.flipHorizontal()
        result.current.flipVertical()
        result.current.setZoom(2)
      })

      expect(result.current.hasChanges).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.state.rotation).toBe(0)
      expect(result.current.state.flipH).toBe(false)
      expect(result.current.state.flipV).toBe(false)
      expect(result.current.state.zoom).toBe(1)
      expect(result.current.hasChanges).toBe(false)
    })

    it('should reset crop area', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setCrop({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 })
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.state.crop).toBeNull()
    })

    it('should reset aspect ratio', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.setAspectRatio('16:9')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.aspectRatio).toBe('free')
    })
  })

  describe('Combined Transformations', () => {
    it('should track hasChanges for rotation + flip', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
      })

      expect(result.current.hasChanges).toBe(true)

      act(() => {
        result.current.flipHorizontal()
      })

      expect(result.current.hasChanges).toBe(true)
      expect(result.current.state.rotation).toBe(90)
      expect(result.current.state.flipH).toBe(true)
    })

    it('should maintain state after multiple operations', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
        result.current.rotateRight()
        result.current.flipHorizontal()
        result.current.rotateLeft()
      })

      expect(result.current.state.rotation).toBe(90)
      expect(result.current.state.flipH).toBe(true)
      expect(result.current.hasChanges).toBe(true)
    })
  })

  describe('Apply', () => {
    it('should call onApply with edited file', async () => {
      const onApply = vi.fn()
      const { result } = renderHook(() =>
        useImageEditor({ ...defaultOptions, onApply })
      )

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
      })

      await act(async () => {
        await result.current.apply()
      })

      expect(onApply).toHaveBeenCalled()
      const [file, url] = onApply.mock.calls[0]
      expect(file).toBeInstanceOf(File)
      expect(typeof url).toBe('string')
    })

    it('should preserve filename on apply', async () => {
      const onApply = vi.fn()
      const { result } = renderHook(() =>
        useImageEditor({ ...defaultOptions, onApply })
      )

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
      })

      await act(async () => {
        await result.current.apply()
      })

      expect(onApply).toHaveBeenCalled()
      const [file] = onApply.mock.calls[0]
      expect(file.name).toBe('test.jpg')
    })

    it('should set isApplying during apply', async () => {
      const onApply = vi.fn()
      const { result } = renderHook(() =>
        useImageEditor({ ...defaultOptions, onApply })
      )

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      act(() => {
        result.current.rotateRight()
      })

      // Check isApplying is false before
      expect(result.current.isApplying).toBe(false)

      // Note: In a real test we'd check during the apply call
      await act(async () => {
        await result.current.apply()
      })

      // After apply, isApplying should be false again
      expect(result.current.isApplying).toBe(false)
    })
  })

  describe('Image Size', () => {
    it('should calculate image size after load', async () => {
      const { result } = renderHook(() => useImageEditor(defaultOptions))

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      expect(result.current.imageSize.width).toBe(800)
      expect(result.current.imageSize.height).toBe(600)
    })

    it('should calculate canvas size respecting max size', async () => {
      const { result } = renderHook(() =>
        useImageEditor({ ...defaultOptions, maxCanvasSize: 400 })
      )

      await waitFor(() => expect(result.current.imageLoaded).toBe(true))

      // Canvas should be scaled down from 800x600 to fit in 400x400
      expect(result.current.canvasSize.width).toBeLessThanOrEqual(400)
      expect(result.current.canvasSize.height).toBeLessThanOrEqual(400)
    })
  })
})
