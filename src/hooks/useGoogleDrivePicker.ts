import { useCallback, useState, useRef } from 'react'

declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void
      client?: {
        init: (config: { apiKey?: string; discoveryDocs?: string[] }) => Promise<void>
      }
      auth2?: {
        getAuthInstance: () => {
          isSignedIn: { get: () => boolean }
          signIn: (options?: { scope?: string }) => Promise<{ getAuthResponse: () => { access_token: string } }>
          currentUser: { get: () => { getAuthResponse: () => { access_token: string } } }
        }
      }
    }
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
      picker?: {
        PickerBuilder: new () => GooglePickerBuilder
        ViewId: { DOCS: string }
        DocsView: new (viewId?: string) => GoogleDocsView
        Action: { PICKED: string; CANCEL: string }
      }
    }
  }
}

interface GooglePickerBuilder {
  addView: (view: GoogleDocsView) => GooglePickerBuilder
  setOAuthToken: (token: string) => GooglePickerBuilder
  setDeveloperKey: (key: string) => GooglePickerBuilder
  setAppId: (appId: string) => GooglePickerBuilder
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder
  enableFeature: (feature: number) => GooglePickerBuilder
  build: () => { setVisible: (visible: boolean) => void }
}

interface GoogleDocsView {
  setMimeTypes: (types: string) => GoogleDocsView
}

interface GooglePickerResponse {
  action: string
  docs?: GoogleDriveFile[]
}

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  sizeBytes?: number
  url?: string
  iconUrl?: string
  thumbnails?: Array<{ url: string; width?: number; height?: number }>
}

export interface UseGoogleDrivePickerOptions {
  /** Google OAuth Client ID */
  clientId: string
  /** Google API Key (for Picker) */
  apiKey: string
  /** Google App ID */
  appId: string
  /** Callback when files are selected */
  onSelect: (files: GoogleDriveFile[], accessToken: string) => void
  /** Callback when picker is cancelled */
  onCancel?: () => void
  /** Allow multiple file selection */
  multiselect?: boolean
  /** MIME types to filter (comma-separated) */
  mimeTypes?: string
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file'

const DEFAULT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'application/pdf',
].join(',')

export function useGoogleDrivePicker({
  clientId,
  apiKey,
  appId,
  onSelect,
  onCancel,
  multiselect = true,
  mimeTypes = DEFAULT_MIME_TYPES,
}: UseGoogleDrivePickerOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const accessTokenRef = useRef<string | null>(null)
  const pickerInitedRef = useRef(false)

  const isConfigured = !!(clientId && apiKey && appId)

  const loadGoogleScripts = useCallback(async () => {
    // Load GSI script (Google Identity Services)
    if (!document.getElementById('google-gsi-script')) {
      const gsiScript = document.createElement('script')
      gsiScript.id = 'google-gsi-script'
      gsiScript.src = 'https://accounts.google.com/gsi/client'
      gsiScript.async = true
      gsiScript.defer = true
      document.body.appendChild(gsiScript)
      await new Promise<void>((resolve) => {
        gsiScript.onload = () => resolve()
      })
    }

    // Load Picker API
    if (!document.getElementById('google-picker-script')) {
      const pickerScript = document.createElement('script')
      pickerScript.id = 'google-picker-script'
      pickerScript.src = 'https://apis.google.com/js/api.js'
      pickerScript.async = true
      pickerScript.defer = true
      document.body.appendChild(pickerScript)
      await new Promise<void>((resolve) => {
        pickerScript.onload = () => resolve()
      })
    }

    // Wait for gapi to be available and load picker
    if (window.gapi && !pickerInitedRef.current) {
      await new Promise<void>((resolve) => {
        window.gapi!.load('picker', () => {
          pickerInitedRef.current = true
          resolve()
        })
      })
    }

    setIsReady(true)
  }, [])

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (accessTokenRef.current) {
      return accessTokenRef.current
    }

    return new Promise((resolve) => {
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response.access_token) {
            accessTokenRef.current = response.access_token
            resolve(response.access_token)
          } else {
            console.error('Google OAuth error:', response.error)
            resolve(null)
          }
        },
      })
      tokenClient.requestAccessToken()
    })
  }, [clientId])

  const showPicker = useCallback(
    (accessToken: string) => {
      if (!window.google?.picker) {
        console.error('Google Picker API not loaded')
        return
      }

      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      view.setMimeTypes(mimeTypes)

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setAppId(appId)
        .setCallback((data: GooglePickerResponse) => {
          if (data.action === window.google!.picker!.Action.PICKED) {
            setIsLoading(false)
            if (data.docs && accessTokenRef.current) {
              onSelect(data.docs, accessTokenRef.current)
            }
          } else if (data.action === window.google!.picker!.Action.CANCEL) {
            setIsLoading(false)
            onCancel?.()
          }
        })

      // Enable multiselect feature (feature value is 1)
      if (multiselect) {
        picker.enableFeature(1)
      }

      const pickerInstance = picker.build()
      pickerInstance.setVisible(true)
    },
    [apiKey, appId, mimeTypes, multiselect, onSelect, onCancel]
  )

  const openPicker = useCallback(async () => {
    if (!isConfigured) {
      console.warn('Google Drive Picker not configured')
      return
    }

    setIsLoading(true)

    try {
      await loadGoogleScripts()
      const accessToken = await getAccessToken()
      if (accessToken) {
        showPicker(accessToken)
      } else {
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Failed to open Google Drive Picker:', err)
      setIsLoading(false)
    }
  }, [isConfigured, loadGoogleScripts, getAccessToken, showPicker])

  return {
    /** Open the Google Drive picker */
    openPicker,
    /** Loading state */
    isLoading,
    /** Whether all APIs are loaded and ready */
    isReady,
    /** Whether the picker is configured */
    isConfigured,
  }
}
