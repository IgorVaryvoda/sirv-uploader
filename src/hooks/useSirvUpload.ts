import { useState, useCallback, useRef } from 'react'
import { generateId, getMimeType } from '../utils/image-utils'
import type {
  SirvFile,
  UploadStatus,
  ConflictResolution,
  PresignResponse,
  UploadResponse,
} from '../types'

export interface UseSirvUploadOptions {
  /** Endpoint to get presigned URLs (recommended) */
  presignEndpoint?: string
  /** Full proxy endpoint (alternative) */
  proxyEndpoint?: string
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
    presignEndpoint,
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

  // Update a file's state
  const updateFile = useCallback((id: string, updates: Partial<SirvFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    )
  }, [])

  // Upload using presigned URL (direct to Sirv S3)
  const uploadWithPresign = useCallback(
    async (file: SirvFile, signal: AbortSignal): Promise<void> => {
      if (!presignEndpoint) throw new Error('No presign endpoint configured')
      if (!file.file) throw new Error('No file data')

      // 1. Get presigned URL from user's backend
      const presignRes = await fetch(presignEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.filename,
          contentType: getMimeType(file.file),
          folder,
          size: file.file.size,
        }),
        signal,
      })

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to get upload URL: ${presignRes.status}`)
      }

      const { uploadUrl, publicUrl, path, error }: PresignResponse = await presignRes.json()
      if (error) throw new Error(error)
      if (!uploadUrl) throw new Error('No upload URL returned')

      // 2. Upload directly to Sirv S3
      updateFile(file.id, { status: 'uploading', progress: 10 })

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file.file,
        headers: {
          'Content-Type': getMimeType(file.file),
        },
        signal,
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`)
      }

      // 3. Success
      updateFile(file.id, {
        status: 'success',
        progress: 100,
        sirvUrl: publicUrl,
        sirvPath: path,
      })
    },
    [presignEndpoint, folder, updateFile]
  )

  // Upload using proxy (file data goes through user's server)
  const uploadWithProxy = useCallback(
    async (file: SirvFile, signal: AbortSignal): Promise<void> => {
      if (!proxyEndpoint) throw new Error('No proxy endpoint configured')
      if (!file.file) throw new Error('No file data')

      updateFile(file.id, { status: 'uploading', progress: 10 })

      // Convert file to base64
      const arrayBuffer = await file.file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      updateFile(file.id, { progress: 30 })

      const res = await fetch(`${proxyEndpoint}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: base64,
          filename: file.filename,
          folder,
          contentType: getMimeType(file.file),
          onConflict: onConflict === 'ask' ? 'rename' : onConflict,
        }),
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
    [proxyEndpoint, folder, onConflict, updateFile]
  )

  // Main upload function
  const uploadFile = useCallback(
    async (id: string): Promise<void> => {
      const file = files.find((f) => f.id === id)
      if (!file || file.status === 'uploading' || file.status === 'success') return

      const controller = new AbortController()
      abortControllers.current.set(id, controller)

      try {
        updateFile(id, { status: 'uploading', progress: 0, error: undefined })

        if (presignEndpoint) {
          await uploadWithPresign(file, controller.signal)
        } else if (proxyEndpoint) {
          await uploadWithProxy(file, controller.signal)
        } else {
          throw new Error('No upload endpoint configured')
        }

        // Notify success
        const updatedFile = files.find((f) => f.id === id)
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
    [files, presignEndpoint, proxyEndpoint, uploadWithPresign, uploadWithProxy, updateFile, onUpload, onError]
  )

  // Process upload queue with concurrency limit
  const processQueue = useCallback(() => {
    while (activeUploads.current < concurrency && uploadQueue.current.length > 0) {
      const id = uploadQueue.current.shift()
      if (id) {
        activeUploads.current++
        uploadFile(id)
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
      setFiles((prev) => [...prev, ...newFiles])

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

    // Remove from list
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // Clear all files
  const clearFiles = useCallback(() => {
    // Cancel all uploads
    abortControllers.current.forEach((controller) => controller.abort())
    abortControllers.current.clear()
    uploadQueue.current = []
    activeUploads.current = 0
    setFiles([])
  }, [])

  // Retry a failed upload
  const retryFile = useCallback(
    async (id: string): Promise<void> => {
      uploadQueue.current.push(id)
      processQueue()
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
