import { useCallback, useEffect, useState } from 'react'

declare global {
  interface Window {
    Dropbox?: {
      choose: (options: DropboxChooserOptions) => void
      isBrowserSupported: () => boolean
    }
  }
}

interface DropboxChooserOptions {
  success: (files: DropboxFile[]) => void
  cancel?: () => void
  linkType: 'preview' | 'direct'
  multiselect: boolean
  extensions?: string[]
  folderselect?: boolean
  sizeLimit?: number
}

export interface DropboxFile {
  id: string
  name: string
  link: string
  bytes: number
  icon: string
  thumbnailLink?: string
  isDir: boolean
}

export interface UseDropboxChooserOptions {
  /** Dropbox App Key - get from https://www.dropbox.com/developers/apps */
  appKey: string
  /** Callback when files are selected */
  onSelect: (files: DropboxFile[]) => void
  /** Callback when picker is cancelled */
  onCancel?: () => void
  /** Allow multiple file selection */
  multiselect?: boolean
  /** File extensions to filter by */
  extensions?: string[]
  /** Max file size in bytes */
  maxSizeBytes?: number
}

const DEFAULT_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif', '.bmp', '.tiff', '.tif',
  '.mp4', '.webm', '.mov', '.avi',
  '.glb', '.gltf', '.obj', '.fbx',
  '.pdf',
]

export function useDropboxChooser({
  appKey,
  onSelect,
  onCancel,
  multiselect = true,
  extensions = DEFAULT_EXTENSIONS,
  maxSizeBytes,
}: UseDropboxChooserOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!appKey) return

    const checkSupport = () => {
      if (window.Dropbox) {
        setIsSupported(window.Dropbox.isBrowserSupported())
        setIsReady(true)
      }
    }

    // Already loaded
    if (window.Dropbox) {
      requestAnimationFrame(checkSupport)
      return
    }

    // Load the Dropbox script
    const existingScript = document.getElementById('dropboxjs')
    if (existingScript) {
      checkSupport()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js'
    script.id = 'dropboxjs'
    script.setAttribute('data-app-key', appKey)
    script.async = true

    script.onload = checkSupport

    document.body.appendChild(script)

    return () => {
      // Don't remove the script on unmount as other instances might need it
    }
  }, [appKey])

  const openChooser = useCallback(() => {
    if (!window.Dropbox || !isSupported) {
      console.warn('Dropbox Chooser not available')
      return
    }

    setIsLoading(true)

    window.Dropbox.choose({
      success: (files) => {
        setIsLoading(false)
        onSelect(files)
      },
      cancel: () => {
        setIsLoading(false)
        onCancel?.()
      },
      linkType: 'direct',
      multiselect,
      extensions,
      sizeLimit: maxSizeBytes,
    })
  }, [isSupported, onSelect, onCancel, multiselect, extensions, maxSizeBytes])

  return {
    /** Open the Dropbox file chooser */
    openChooser,
    /** Loading state */
    isLoading,
    /** Whether Dropbox is supported in this browser */
    isSupported,
    /** Whether the picker is configured and ready to use */
    isConfigured: !!appKey,
    /** Whether the SDK has finished loading */
    isReady,
  }
}
