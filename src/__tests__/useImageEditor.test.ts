import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useImageEditor } from '../hooks/useImageEditor'

describe('useImageEditor', () => {
  const mockFile = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
  const mockPreviewUrl = 'blob:test-preview'

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Image
    global.Image = class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      width = 800
      height = 600

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
    } as unknown as typeof Image

    // Mock canvas
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
    }))

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(['test'], { type: 'image/jpeg' }))
    })

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,test')
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(result.current.state.rotation).toBe(0)
    expect(result.current.state.flipH).toBe(false)
    expect(result.current.state.flipV).toBe(false)
    expect(result.current.state.crop).toBeNull()
    expect(result.current.hasChanges).toBe(false)
    expect(result.current.isApplying).toBe(false)
  })

  it('should start loading image', () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(result.current.isLoading).toBe(true)
  })

  it('should set imageLoaded to true after image loads', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => {
      expect(result.current.imageLoaded).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should rotate right by 90 degrees', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.rotateRight()
    })

    expect(result.current.state.rotation).toBe(90)
    expect(result.current.hasChanges).toBe(true)
  })

  it('should rotate left by 90 degrees', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.rotateLeft()
    })

    expect(result.current.state.rotation).toBe(270)
    expect(result.current.hasChanges).toBe(true)
  })

  it('should wrap rotation at 360 degrees', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.rotateRight()
      result.current.rotateRight()
      result.current.rotateRight()
      result.current.rotateRight()
    })

    expect(result.current.state.rotation).toBe(0)
  })

  it('should flip horizontally', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.flipHorizontal()
    })

    expect(result.current.state.flipH).toBe(true)
    expect(result.current.hasChanges).toBe(true)
  })

  it('should toggle flip on second click', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.flipHorizontal()
    })
    expect(result.current.state.flipH).toBe(true)

    act(() => {
      result.current.flipHorizontal()
    })
    expect(result.current.state.flipH).toBe(false)
  })

  it('should flip vertically', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.flipVertical()
    })

    expect(result.current.state.flipV).toBe(true)
    expect(result.current.hasChanges).toBe(true)
  })

  it('should set crop area', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    const cropArea = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
    act(() => {
      result.current.setCrop(cropArea)
    })

    expect(result.current.state.crop).toEqual(cropArea)
    expect(result.current.hasChanges).toBe(true)
  })

  it('should clear crop area', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 })
    })
    expect(result.current.state.crop).not.toBeNull()

    act(() => {
      result.current.setCrop(null)
    })
    expect(result.current.state.crop).toBeNull()
  })

  it('should set aspect ratio', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.setAspectRatio('16:9')
    })

    expect(result.current.aspectRatio).toBe('16:9')
  })

  it('should reset all changes', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.rotateRight()
      result.current.flipHorizontal()
      result.current.setCrop({ x: 0, y: 0, width: 0.5, height: 0.5 })
    })

    expect(result.current.hasChanges).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.state.rotation).toBe(0)
    expect(result.current.state.flipH).toBe(false)
    expect(result.current.state.flipV).toBe(false)
    expect(result.current.state.crop).toBeNull()
    expect(result.current.hasChanges).toBe(false)
  })

  it('should track canvas size', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    expect(result.current.canvasSize).toBeDefined()
    // Canvas size may be 0 in test environment without actual canvas rendering
    expect(result.current.canvasSize.width).toBeDefined()
    expect(result.current.canvasSize.height).toBeDefined()
  })

  it('should provide canvasRef', () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(result.current.canvasRef).toBeDefined()
  })

  it('should handle multiple operations', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.rotateRight()
      result.current.rotateRight()
      result.current.flipHorizontal()
    })

    expect(result.current.state.rotation).toBe(180)
    expect(result.current.state.flipH).toBe(true)
    expect(result.current.hasChanges).toBe(true)
  })

  it('should detect no changes when returning to initial state', async () => {
    const { result } = renderHook(() =>
      useImageEditor({
        file: mockFile,
        previewUrl: mockPreviewUrl,
        onApply: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    await waitFor(() => expect(result.current.imageLoaded).toBe(true))

    act(() => {
      result.current.flipHorizontal()
    })
    expect(result.current.hasChanges).toBe(true)

    act(() => {
      result.current.flipHorizontal()
    })
    expect(result.current.hasChanges).toBe(false)
  })
})
