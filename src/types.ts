// =============================================================================
// SIRV UPLOAD WIDGET - TYPE DEFINITIONS
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface ImageDimensions {
  width: number
  height: number
}

export type FileCategory = 'image' | 'video' | '3d' | 'pdf' | 'other'

export interface SirvFile {
  id: string
  file?: File
  filename: string
  previewUrl: string
  sirvUrl?: string
  sirvPath?: string
  /** External URL (for Dropbox/Google Drive imports) */
  externalUrl?: string
  /** Access token for external URL (for Google Drive) */
  externalAccessToken?: string
  dimensions?: ImageDimensions
  size?: number
  /** File category for display purposes */
  fileCategory?: FileCategory
  status: UploadStatus
  progress: number
  error?: string
}

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error'
  | 'conflict'

export type ConflictResolution = 'overwrite' | 'rename' | 'skip'

export interface ConflictInfo {
  file: SirvFile
  existingPath: string
  suggestedPath: string
}

// -----------------------------------------------------------------------------
// Proxy Upload Mode
// -----------------------------------------------------------------------------

/**
 * The widget uploads files through a proxy endpoint to Sirv's REST API.
 * Your backend receives the file and forwards it to Sirv.
 *
 * Example backend implementation (Next.js):
 * ```typescript
 * // app/api/sirv/upload/route.ts
 * export async function POST(req: Request) {
 *   const url = new URL(req.url)
 *   const filename = url.searchParams.get('filename')!
 *   const folder = url.searchParams.get('folder') || '/'
 *
 *   // Get Sirv access token (you should cache this)
 *   const tokenRes = await fetch('https://api.sirv.com/v2/token', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       clientId: process.env.SIRV_CLIENT_ID,
 *       clientSecret: process.env.SIRV_CLIENT_SECRET,
 *     }),
 *   })
 *   const { token } = await tokenRes.json()
 *
 *   // Upload file to Sirv REST API
 *   const path = `${folder}/${filename}`.replace(/\/+/g, '/')
 *   const uploadRes = await fetch(
 *     `https://api.sirv.com/v2/files/upload?filename=${encodeURIComponent(path)}`,
 *     {
 *       method: 'POST',
 *       headers: {
 *         'Authorization': `Bearer ${token}`,
 *         'Content-Type': req.headers.get('Content-Type') || 'application/octet-stream',
 *       },
 *       body: req.body,
 *     }
 *   )
 *
 *   if (!uploadRes.ok) {
 *     return Response.json({ success: false, error: 'Upload failed' }, { status: 500 })
 *   }
 *
 *   const publicUrl = `https://${process.env.SIRV_ACCOUNT}.sirv.com${path}`
 *   return Response.json({ success: true, url: publicUrl, path })
 * }
 * ```
 */

/** POST {endpoint}/upload - Upload a file to Sirv */
export interface UploadRequest {
  /** Base64-encoded file data OR a URL to fetch */
  data: string
  /** Target filename */
  filename: string
  /** Target folder path (e.g., "/uploads/2024") */
  folder: string
  /** Content type of the file */
  contentType: string
  /** Conflict resolution strategy */
  onConflict?: ConflictResolution
}

export interface UploadResponse {
  success: boolean
  /** Full Sirv URL of the uploaded file */
  url?: string
  /** Path on Sirv (e.g., "/uploads/2024/image.jpg") */
  path?: string
  /** Error message if failed */
  error?: string
  /** True if file already exists */
  conflict?: boolean
  /** Existing file path if conflict */
  existingPath?: string
}

/** GET {endpoint}/browse?path=/folder - List files and folders */
export interface BrowseRequest {
  /** Folder path to browse */
  path: string
  /** Filter by type */
  type?: 'image' | 'video' | 'all'
  /** Search query */
  search?: string
}

export interface BrowseResponse {
  success: boolean
  /** Current folder path */
  path: string
  /** List of items in the folder */
  items?: BrowseItem[]
  error?: string
}

export interface BrowseItem {
  /** File or folder name */
  name: string
  /** Full path */
  path: string
  /** 'file' or 'folder' */
  type: 'file' | 'folder'
  /** File size in bytes (files only) */
  size?: number
  /** MIME type (files only) */
  contentType?: string
  /** Last modified date */
  mtime?: string
  /** Thumbnail URL (images only) */
  thumbnail?: string
}

/** DELETE {endpoint}/delete - Delete a file */
export interface DeleteRequest {
  /** Path of file to delete */
  path: string
}

export interface DeleteResponse {
  success: boolean
  error?: string
}

/** POST {endpoint}/check - Check if file exists (optional) */
export interface CheckRequest {
  /** Path to check */
  path: string
}

export interface CheckResponse {
  exists: boolean
  /** Existing file info if exists */
  file?: BrowseItem
}

// -----------------------------------------------------------------------------
// Component Props
// -----------------------------------------------------------------------------

export interface DropboxConfig {
  /** Dropbox App Key - get from https://www.dropbox.com/developers/apps */
  appKey: string
}

export interface GoogleDriveConfig {
  /** Google OAuth Client ID */
  clientId: string
  /** Google API Key (for Picker) */
  apiKey: string
  /** Google App ID */
  appId: string
}

export interface SirvUploaderProps {
  /**
   * Proxy endpoint URL for uploading files to Sirv.
   * Your backend should forward the file to Sirv's REST API.
   *
   * The widget will call:
   * - POST {endpoint}/upload?filename=...&folder=... (with file binary in body)
   *
   * Expected response: { success: true, url: "...", path: "..." }
   *
   * Optional endpoints for file browsing (if you want to enable Sirv file picker):
   * - GET {endpoint}/browse?path=/folder
   * - DELETE {endpoint}/delete
   */
  proxyEndpoint: string

  /**
   * Default folder to upload files to.
   * @default "/"
   */
  folder?: string

  /**
   * Callback when files are uploaded successfully.
   */
  onUpload?: (files: SirvFile[]) => void

  /**
   * Callback when upload fails.
   */
  onError?: (error: string, file?: SirvFile) => void

  /**
   * Callback when files are selected (before upload).
   */
  onSelect?: (files: SirvFile[]) => void

  /**
   * Callback when a file is removed from the queue.
   */
  onRemove?: (file: SirvFile) => void

  /**
   * Feature flags to enable/disable parts of the widget.
   */
  features?: {
    /** Enable batch/multi-file upload. @default true */
    batch?: boolean
    /** Enable CSV/Excel import tab. @default true */
    csvImport?: boolean
    /** Enable drag and drop. @default true */
    dragDrop?: boolean
    /** Enable clipboard paste. @default true */
    paste?: boolean
    /** Accept all asset types (images, videos, 3D, PDF). @default false */
    allAssets?: boolean
    /** Enable built-in image editor for staged files. @default true */
    imageEditor?: boolean
  }

  /**
   * Dropbox integration configuration.
   * Omit to disable Dropbox import.
   */
  dropbox?: DropboxConfig

  /**
   * Google Drive integration configuration.
   * Omit to disable Google Drive import.
   */
  googleDrive?: GoogleDriveConfig

  /**
   * Maximum number of files for batch upload.
   * @default 50
   */
  maxFiles?: number

  /**
   * Maximum file size in bytes.
   * @default 10485760 (10MB)
   */
  maxFileSize?: number

  /**
   * Accepted file types (MIME types or extensions).
   * @default ["image/*"]
   */
  accept?: string[]

  /**
   * How to handle filename conflicts.
   * - 'ask': Show modal to let user decide
   * - 'overwrite': Always overwrite
   * - 'rename': Always rename with suffix
   * - 'skip': Skip conflicting files
   * @default 'rename'
   */
  onConflict?: ConflictResolution | 'ask'

  /**
   * Auto-upload files immediately after selection.
   * Set to false to show staged files grid before upload.
   * @default true
   */
  autoUpload?: boolean

  /**
   * Number of concurrent uploads.
   * @default 3
   */
  concurrency?: number

  /**
   * Custom class name for the container.
   */
  className?: string

  /**
   * Disable the entire widget.
   */
  disabled?: boolean

  /**
   * Compact mode for smaller spaces.
   */
  compact?: boolean

  /**
   * Color theme.
   * - 'auto': Follow system preference (default)
   * - 'light': Force light mode
   * - 'dark': Force dark mode
   * @default 'auto'
   */
  theme?: 'auto' | 'light' | 'dark'

  /**
   * Custom labels for i18n.
   */
  labels?: Partial<SirvUploaderLabels>

  /**
   * Children to render inside the dropzone (for custom trigger).
   */
  children?: React.ReactNode
}

export interface SirvUploaderLabels {
  dropzone: string
  dropzoneHint: string
  pasteHint: string
  browse: string
  uploadFiles: string
  importUrls: string
  selectFromSirv: string
  importFromDropbox: string
  importFromGoogleDrive: string
  uploading: string
  processing: string
  success: string
  error: string
  retry: string
  remove: string
  edit: string
  addMore: string
  clearAll: string
  upload: string
  cancel: string
  overwrite: string
  rename: string
  skip: string
  conflictTitle: string
  conflictMessage: string
  filesSelected: string
}

// -----------------------------------------------------------------------------
// Hook Types
// -----------------------------------------------------------------------------

export interface UseSirvUploadOptions {
  endpoint: string
  folder: string
  onConflict: ConflictResolution | 'ask'
  concurrency: number
  autoUpload: boolean
  maxFileSize: number
  onUpload?: (files: SirvFile[]) => void
  onError?: (error: string, file?: SirvFile) => void
}

export interface UseSirvUploadReturn {
  /** Current files in the queue */
  files: SirvFile[]
  /** Add files to the queue */
  addFiles: (files: File[]) => void
  /** Add URLs (from CSV/spreadsheet) */
  addUrls: (urls: string[]) => void
  /** Remove a file from the queue */
  removeFile: (id: string) => void
  /** Clear all files */
  clearFiles: () => void
  /** Start uploading all pending files */
  uploadAll: () => Promise<void>
  /** Upload a single file */
  uploadFile: (id: string) => Promise<void>
  /** Retry a failed upload */
  retryFile: (id: string) => Promise<void>
  /** Cancel an in-progress upload */
  cancelUpload: (id: string) => void
  /** Resolve a conflict */
  resolveConflict: (id: string, resolution: ConflictResolution) => void
  /** Current conflict needing resolution (if onConflict='ask') */
  currentConflict: ConflictInfo | null
  /** Overall upload progress (0-100) */
  progress: number
  /** True if any uploads are in progress */
  isUploading: boolean
  /** True if all files have been uploaded */
  isComplete: boolean
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

export interface ParsedUrl {
  url: string
  path: string
  valid: boolean
  error?: string
}

export interface CsvParseOptions {
  /** Column name or index containing URLs */
  column?: string | number
  /** Skip header row */
  hasHeader?: boolean
  /** Validate URLs */
  validate?: boolean
}

export interface CsvParseResult {
  headers: string[]
  urls: ParsedUrl[]
  totalCount: number
  validCount: number
  invalidCount: number
}
