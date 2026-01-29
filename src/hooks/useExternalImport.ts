import { useState, useCallback } from 'react'
import { generateId } from '../utils/image-utils'
import type { SirvFile } from '../types'

export interface ImportProgress {
  current: number
  total: number
  source: string
}

export interface ExternalFile {
  url: string
  name: string
  accessToken?: string
}

export interface UseExternalImportOptions {
  maxFiles: number
  onComplete: (files: SirvFile[]) => void
}

export interface UseExternalImportReturn {
  isImporting: boolean
  progress: ImportProgress
  importFiles: (files: ExternalFile[], source: string) => Promise<void>
}

/**
 * Shared hook for importing files from external sources (URLs, Dropbox, Google Drive)
 * Eliminates duplicated download-and-stage logic
 */
export function useExternalImport({
  maxFiles,
  onComplete,
}: UseExternalImportOptions): UseExternalImportReturn {
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 0, source: '' })

  const downloadFile = useCallback(async (
    url: string,
    filename: string,
    accessToken?: string
  ): Promise<SirvFile | null> => {
    try {
      const headers: HeadersInit = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }
      const response = await fetch(url, { headers })
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const file = new File([blob], filename, { type: blob.type || 'image/png' })
      return {
        id: generateId(),
        file,
        filename,
        previewUrl: URL.createObjectURL(blob),
        size: blob.size,
        status: 'pending' as const,
        progress: 0,
      }
    } catch (err) {
      console.error(`Failed to download ${filename}:`, err)
      return null
    }
  }, [])

  const importFiles = useCallback(
    async (files: ExternalFile[], source: string) => {
      const filesToImport = files.slice(0, maxFiles)
      if (filesToImport.length === 0) return

      setIsImporting(true)
      setProgress({ current: 0, total: filesToImport.length, source })

      // Download files in parallel batches for better performance
      const BATCH_SIZE = 3
      const results: SirvFile[] = []

      for (let i = 0; i < filesToImport.length; i += BATCH_SIZE) {
        const batch = filesToImport.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map((f) => downloadFile(f.url, f.name, f.accessToken))
        const batchResults = await Promise.all(batchPromises)

        for (const result of batchResults) {
          if (result) results.push(result)
        }

        setProgress({ current: Math.min(i + BATCH_SIZE, filesToImport.length), total: filesToImport.length, source })
      }

      setIsImporting(false)
      setProgress({ current: 0, total: 0, source: '' })

      if (results.length > 0) {
        onComplete(results)
      }
    },
    [maxFiles, downloadFile, onComplete]
  )

  return {
    isImporting,
    progress,
    importFiles,
  }
}
