import { useState, useCallback, useRef } from 'react'
import { generateId, getMimeType } from '../utils/image-utils'
import type {
  SirvFile,
  UploadStatus,
  ConflictResolution,
  UploadResponse,
} from '../types'

export interface UseSirvUploadOptions {
  /**
   * Proxy endpoint URL for uploading files to Sirv.
   * Your backend should forward the file to Sirv's REST API.
   *
   * The widget will POST to: {proxyEndpoint}/upload?filename=...&folder=...
   * with the file binary in the request body.
   *
   * Expected response: { success: true, url: "...", path: "..." }
   */
  proxyEndpoint: string
  /** Default upload folder */
  folder: string
  /** Conflict resolution strategy */
  onConflict: ConflictResolution | 'ask'
  /** Max concurrent uploads */
  concurrency: number
  /** Auto-upload on file add */
  autoUpload: boolean
  /** Max file size */
  maxFileSize: number
  /** Callback on successful uploads */
  onUpload?: (files: SirvFile[]) => void
  /** Callback on errors */
  onError?: (error: string, file?: SirvFile) => void
}

export interface UseSirvUploadReturn {
  files: SirvFile[]
  addFiles: (newFiles: SirvFile[]) => void
  addUrls: (urls: string[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  uploadAll: () => Promise<void>
  uploadFile: (id: string) => Promise<void>
  retryFile: (id: string) => Promise<void>
  cancelUpload: (id: string) => void
  progress: number
  isUploading: boolean
  isComplete: boolean
}

export function useSirvUpload(options: UseSirvUploadOptions): UseSirvUploadReturn {
  const {
    proxyEndpoint,
    folder,
    onConflict,
    concurrency,
    autoUpload,
    onUpload,
    onError,
  } = options

  const [files, setFiles] = useState<SirvFile[]>([])
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const uploadQueue = useRef<string[]>([])
  const activeUploads = useRef<number>(0)
  const filesRef = useRef<SirvFile[]>([])

  // Update a file's state
  const updateFile = useCallback((id: string, updates: Partial<SirvFile>) => {
    filesRef.current = filesRef.current.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    )
    setFiles(filesRef.current)
  }, [])

  // Upload file through proxy endpoint to Sirv REST API
  const uploadWithProxy = useCallback(
    async (file: SirvFile, signal: AbortSignal): Promise<void> => {
      if (!proxyEndpoint) throw new Error('No proxy endpoint configured')
      if (!file.file) throw new Error('No file data')

      updateFile(file.id, { status: 'uploading', progress: 10 })

      // Build upload URL with query params
      // Handle both absolute URLs (https://...) and relative paths (/api/...)
      const baseUrl = proxyEndpoint.startsWith('http')
        ? proxyEndpoint
        : `${typeof window !== 'undefined' ? window.location.origin : ''}${proxyEndpoint}`
      const uploadUrl = new URL(`${baseUrl}/upload`)
      uploadUrl.searchParams.set('filename', file.filename)
      uploadUrl.searchParams.set('folder', folder)

      updateFile(file.id, { progress: 30 })

      // Upload file directly (binary)
      const res = await fetch(uploadUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': getMimeType(file.file) },
        body: file.file,
        signal,
      })

      updateFile(file.id, { progress: 80 })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Upload failed: ${res.status}`)
      }

      const result: UploadResponse = await res.json()
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      updateFile(file.id, {
        status: 'success',
        progress: 100,
        sirvUrl: result.url,
        sirvPath: result.path,
      })
    },
    [proxyEndpoint, folder, updateFile]
  )

  // Main upload function
  const uploadFile = useCallback(
    async (id: string): Promise<void> => {
      const file = filesRef.current.find((f) => f.id === id)
      if (!file || file.status === 'uploading' || file.status === 'success') {
        // File not found or already processed - decrement counter and process next
        // (counter was incremented by processQueue before calling this)
        activeUploads.current--
        // Use setTimeout to avoid synchronous recursion
        setTimeout(() => processQueue(), 0)
        return
      }

      const controller = new AbortController()
      abortControllers.current.set(id, controller)

      try {
        updateFile(id, { status: 'uploading', progress: 0, error: undefined })

        await uploadWithProxy(file, controller.signal)

        // Notify success - get fresh file reference
        const updatedFile = filesRef.current.find((f) => f.id === id)
        if (updatedFile && onUpload) {
          onUpload([{ ...updatedFile, status: 'success' }])
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          updateFile(id, { status: 'pending', progress: 0 })
          return
        }

        const errorMsg = err instanceof Error ? err.message : 'Upload failed'
        updateFile(id, { status: 'error', progress: 0, error: errorMsg })
        onError?.(errorMsg, file)
      } finally {
        abortControllers.current.delete(id)
        activeUploads.current--
        processQueue()
      }
    },
    [proxyEndpoint, uploadWithProxy, updateFile, onUpload, onError]
  )

  // Process upload queue with concurrency limit
  // Use setTimeout to avoid synchronous recursive calls
  const processQueue = useCallback(() => {
    while (activeUploads.current < concurrency && uploadQueue.current.length > 0) {
      const id = uploadQueue.current.shift()
      if (id) {
        activeUploads.current++
        // Defer to avoid synchronous recursion when upload completes quickly
        void uploadFile(id)
      }
    }
  }, [concurrency, uploadFile])

  // Upload all pending files
  const uploadAll = useCallback(async (): Promise<void> => {
    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error')
    uploadQueue.current = pendingFiles.map((f) => f.id)
    processQueue()
  }, [files, processQueue])

  // Add files to the list
  const addFiles = useCallback(
    (newFiles: SirvFile[]) => {
      // Update ref immediately so processQueue can find the files
      filesRef.current = [...filesRef.current, ...newFiles]
      setFiles(filesRef.current)

      if (autoUpload) {
        // Queue new files for upload
        uploadQueue.current.push(...newFiles.map((f) => f.id))
        processQueue()
      }
    },
    [autoUpload, processQueue]
  )

  // Add URLs (from CSV/spreadsheet)
  const addUrls = useCallback(
    (urls: string[]) => {
      const newFiles: SirvFile[] = urls.map((url) => {
        const filename = url.split('/').pop() || 'image.jpg'
        return {
          id: generateId(),
          filename,
          previewUrl: url,
          sirvUrl: url,
          status: 'success' as UploadStatus,
          progress: 100,
        }
      })

      setFiles((prev) => [...prev, ...newFiles])
    },
    []
  )

  // Remove a file
  const removeFile = useCallback((id: string) => {
    // Cancel if uploading
    const controller = abortControllers.current.get(id)
    if (controller) {
      controller.abort()
    }

    // Remove from queue
    uploadQueue.current = uploadQueue.current.filter((qid) => qid !== id)

    // Remove from list - update ref immediately
    filesRef.current = filesRef.current.filter((f) => f.id !== id)
    setFiles(filesRef.current)
  }, [])

  // Clear all files
  const clearFiles = useCallback(() => {
    // Cancel all uploads
    abortControllers.current.forEach((controller) => controller.abort())
    abortControllers.current.clear()
    uploadQueue.current = []
    activeUploads.current = 0
    filesRef.current = []
    setFiles([])
  }, [])

  // Retry a failed upload
  const retryFile = useCallback(
    async (id: string): Promise<void> => {
      // Prevent duplicate entries in the queue
      if (!uploadQueue.current.includes(id)) {
        uploadQueue.current.push(id)
        processQueue()
      }
    },
    [processQueue]
  )

  // Cancel an upload
  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id)
    if (controller) {
      controller.abort()
    }
  }, [])

  // Calculate overall progress
  const progress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0

  const isUploading = files.some((f) => f.status === 'uploading' || f.status === 'processing')
  const isComplete = files.length > 0 && files.every((f) => f.status === 'success')

  return {
    files,
    addFiles,
    addUrls,
    removeFile,
    clearFiles,
    uploadAll,
    uploadFile,
    retryFile,
    cancelUpload,
    progress,
    isUploading,
    isComplete,
  }
}
