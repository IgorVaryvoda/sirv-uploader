import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExternalImport } from '../hooks/useExternalImport'

describe('useExternalImport', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 50,
        onComplete: vi.fn(),
      })
    )

    expect(result.current.isImporting).toBe(false)
    expect(result.current.progress).toEqual({ current: 0, total: 0, source: '' })
  })

  it('should provide importFiles function', () => {
    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 50,
        onComplete: vi.fn(),
      })
    )

    expect(typeof result.current.importFiles).toBe('function')
  })

  it('should import files from URLs', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 50,
        onComplete,
      })
    )

    await act(async () => {
      await result.current.importFiles(
        [
          { url: 'https://example.com/image1.jpg', name: 'image1.jpg' },
          { url: 'https://example.com/image2.jpg', name: 'image2.jpg' },
        ],
        'URLs'
      )
    })

    expect(onComplete).toHaveBeenCalled()
    const files = onComplete.mock.calls[0][0]
    expect(files).toHaveLength(2)
    expect(files[0].filename).toBe('image1.jpg')
    expect(files[1].filename).toBe('image2.jpg')
  })

  it('should not call onComplete when no files to import', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 50,
        onComplete,
      })
    )

    await act(async () => {
      await result.current.importFiles([], 'URLs')
    })

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('should respect maxFiles limit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'])),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 2,
        onComplete,
      })
    )

    await act(async () => {
      await result.current.importFiles(
        [
          { url: 'https://example.com/1.jpg', name: '1.jpg' },
          { url: 'https://example.com/2.jpg', name: '2.jpg' },
          { url: 'https://example.com/3.jpg', name: '3.jpg' },
          { url: 'https://example.com/4.jpg', name: '4.jpg' },
        ],
        'URLs'
      )
    })

    const files = onComplete.mock.calls[0][0]
    expect(files).toHaveLength(2)
  })

  it('should include access token in fetch headers when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'])),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 50,
        onComplete: vi.fn(),
      })
    )

    await act(async () => {
      await result.current.importFiles(
        [
          {
            url: 'https://drive.google.com/file.jpg',
            name: 'file.jpg',
            accessToken: 'test-token-123',
          },
        ],
        'Google Drive'
      )
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://drive.google.com/file.jpg',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    )
  })

  it('should handle fetch errors gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })
    vi.stubGlobal('fetch', mockFetch)

    const onComplete = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 50,
        onComplete,
      })
    )

    await act(async () => {
      await result.current.importFiles(
        [{ url: 'https://example.com/missing.jpg', name: 'missing.jpg' }],
        'URLs'
      )
    })

    // Should log error
    expect(consoleError).toHaveBeenCalled()

    // Should not call onComplete with empty array (no successful downloads)
    expect(onComplete).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('should create SirvFile objects with correct properties', async () => {
    const mockBlob = new Blob(['test content'], { type: 'image/png' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExternalImport({
        maxFiles: 50,
        onComplete,
      })
    )

    await act(async () => {
      await result.current.importFiles(
        [{ url: 'https://example.com/photo.png', name: 'photo.png' }],
        'URLs'
      )
    })

    const file = onComplete.mock.calls[0][0][0]
    expect(file.id).toBeDefined()
    expect(file.filename).toBe('photo.png')
    expect(file.status).toBe('pending')
    expect(file.progress).toBe(0)
    expect(file.file).toBeInstanceOf(File)
    expect(file.previewUrl).toBeDefined()
    expect(file.size).toBe(mockBlob.size)
  })
})
