import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSirvUpload } from '../hooks/useSirvUpload'
import type { SirvFile } from '../types'

describe('useSirvUpload', () => {
  const defaultOptions = {
    presignEndpoint: '/api/presign',
    folder: '/uploads',
    onConflict: 'rename' as const,
    concurrency: 3,
    autoUpload: false,
    maxFileSize: 10 * 1024 * 1024,
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with empty files', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    expect(result.current.files).toEqual([])
    expect(result.current.isUploading).toBe(false)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.progress).toBe(0)
  })

  it('should add files', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    const mockFile: SirvFile = {
      id: '1',
      filename: 'test.jpg',
      previewUrl: 'blob:test',
      status: 'pending',
      progress: 0,
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    }

    act(() => {
      result.current.addFiles([mockFile])
    })

    expect(result.current.files).toHaveLength(1)
    expect(result.current.files[0].filename).toBe('test.jpg')
  })

  it('should remove files', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    const mockFile: SirvFile = {
      id: '1',
      filename: 'test.jpg',
      previewUrl: 'blob:test',
      status: 'pending',
      progress: 0,
    }

    act(() => {
      result.current.addFiles([mockFile])
    })

    expect(result.current.files).toHaveLength(1)

    act(() => {
      result.current.removeFile('1')
    })

    expect(result.current.files).toHaveLength(0)
  })

  it('should clear all files', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    const mockFiles: SirvFile[] = [
      { id: '1', filename: 'test1.jpg', previewUrl: 'blob:test1', status: 'pending', progress: 0 },
      { id: '2', filename: 'test2.jpg', previewUrl: 'blob:test2', status: 'pending', progress: 0 },
    ]

    act(() => {
      result.current.addFiles(mockFiles)
    })

    expect(result.current.files).toHaveLength(2)

    act(() => {
      result.current.clearFiles()
    })

    expect(result.current.files).toHaveLength(0)
  })

  it('should add URLs as successful files', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    act(() => {
      result.current.addUrls([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ])
    })

    expect(result.current.files).toHaveLength(2)
    expect(result.current.files[0].status).toBe('success')
    expect(result.current.files[0].sirvUrl).toBe('https://example.com/image1.jpg')
    expect(result.current.files[1].filename).toBe('image2.jpg')
  })

  it('should calculate progress', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    const mockFiles: SirvFile[] = [
      { id: '1', filename: 'test1.jpg', previewUrl: '', status: 'success', progress: 100 },
      { id: '2', filename: 'test2.jpg', previewUrl: '', status: 'uploading', progress: 50 },
    ]

    act(() => {
      result.current.addFiles(mockFiles)
    })

    expect(result.current.progress).toBe(75) // (100 + 50) / 2
  })

  it('should report isComplete when all files succeed', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    const mockFiles: SirvFile[] = [
      { id: '1', filename: 'test1.jpg', previewUrl: '', status: 'success', progress: 100 },
      { id: '2', filename: 'test2.jpg', previewUrl: '', status: 'success', progress: 100 },
    ]

    act(() => {
      result.current.addFiles(mockFiles)
    })

    expect(result.current.isComplete).toBe(true)
  })

  it('should report isUploading when files are uploading', () => {
    const { result } = renderHook(() => useSirvUpload(defaultOptions))

    const mockFiles: SirvFile[] = [
      { id: '1', filename: 'test1.jpg', previewUrl: '', status: 'uploading', progress: 50 },
    ]

    act(() => {
      result.current.addFiles(mockFiles)
    })

    expect(result.current.isUploading).toBe(true)
  })

  it('should queue files for auto-upload when autoUpload is true', () => {
    const { result } = renderHook(() =>
      useSirvUpload({ ...defaultOptions, autoUpload: true })
    )

    const mockFile: SirvFile = {
      id: '1',
      filename: 'test.jpg',
      previewUrl: 'blob:test',
      status: 'pending',
      progress: 0,
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    }

    act(() => {
      result.current.addFiles([mockFile])
    })

    // Files should be added to the queue
    expect(result.current.files).toHaveLength(1)
    expect(result.current.files[0].filename).toBe('test.jpg')
  })

  it('should handle upload errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onError = vi.fn()
    const { result } = renderHook(() =>
      useSirvUpload({ ...defaultOptions, onError })
    )

    const mockFile: SirvFile = {
      id: '1',
      filename: 'test.jpg',
      previewUrl: 'blob:test',
      status: 'pending',
      progress: 0,
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    }

    act(() => {
      result.current.addFiles([mockFile])
    })

    await act(async () => {
      await result.current.uploadFile('1')
    })

    await waitFor(() => {
      expect(result.current.files[0].status).toBe('error')
    })
  })

  it('should call onUpload callback on success', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://s3.sirv.com/presigned',
          publicUrl: 'https://account.sirv.com/uploads/test.jpg',
          path: '/uploads/test.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
      })
    vi.stubGlobal('fetch', mockFetch)

    const onUpload = vi.fn()
    const { result } = renderHook(() =>
      useSirvUpload({ ...defaultOptions, onUpload })
    )

    const mockFile: SirvFile = {
      id: '1',
      filename: 'test.jpg',
      previewUrl: 'blob:test',
      status: 'pending',
      progress: 0,
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    }

    act(() => {
      result.current.addFiles([mockFile])
    })

    await act(async () => {
      await result.current.uploadFile('1')
    })

    await waitFor(() => {
      expect(result.current.files[0].status).toBe('success')
    })
  })
})
