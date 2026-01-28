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
// Presigned URL Mode (RECOMMENDED)
// -----------------------------------------------------------------------------

/**
 * For presigned URL mode, user's backend only needs ONE endpoint.
 * The widget uploads directly to Sirv's S3 endpoint.
 *
 * Example backend implementation (Next.js):
 * ```typescript
 * import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
 * import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
 *
 * const s3 = new S3Client({
 *   endpoint: 'https://s3.sirv.com',
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: process.env.SIRV_S3_KEY!,
 *     secretAccessKey: process.env.SIRV_S3_SECRET!,
 *   },
 *   forcePathStyle: true,
 * })
 *
 * export async function POST(req: Request) {
 *   const { filename, contentType, folder } = await req.json()
 *   const key = `${folder}/${filename}`.replace(/^\/+/, '')
 *
 *   const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
 *     Bucket: process.env.SIRV_BUCKET!,
 *     Key: key,
 *     ContentType: contentType,
 *   }), { expiresIn: 300 })
 *
 *   const publicUrl = `https://${process.env.SIRV_BUCKET}.sirv.com/${key}`
 *   return Response.json({ uploadUrl, publicUrl, path: '/' + key })
 * }
 * ```
 */

/** POST {presignEndpoint} - Get a presigned upload URL */
export interface PresignRequest {
  /** Target filename */
  filename: string
  /** Content type of the file */
  contentType: string
  /** Target folder path (e.g., "/uploads/2024") */
  folder?: string
  /** File size in bytes (for validation) */
  size?: number
}

export interface PresignResponse {
  /** Presigned URL to upload directly to Sirv S3 */
  uploadUrl: string
  /** Public CDN URL where file will be accessible */
  publicUrl: string
  /** Path on Sirv (e.g., "/uploads/2024/image.jpg") */
  path: string
  /** Error message if failed */
  error?: string
}

// -----------------------------------------------------------------------------
// Proxy Mode (Alternative)
// -----------------------------------------------------------------------------

/**
 * For proxy mode, user's backend handles all Sirv operations.
 * Use this if you can't use presigned URLs or need more control.
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
   * RECOMMENDED: Endpoint to get presigned upload URLs.
   * Widget will POST { filename, contentType, folder } and expect { uploadUrl, publicUrl, path }
   * Then upload directly to Sirv's S3 endpoint.
   *
   * Your backend just needs to call AWS SDK's getSignedUrl with Sirv's S3 endpoint.
   */
  presignEndpoint?: string

  /**
   * ALTERNATIVE: Base URL for full proxy endpoint.
   * Use this if you can't use presigned URLs.
   * The widget will call:
   * - POST {endpoint}/upload (with file data)
   * - GET {endpoint}/browse
   * - DELETE {endpoint}/delete
   */
  proxyEndpoint?: string

  /**
   * Sirv account/bucket name (e.g., "myaccount" for myaccount.sirv.com)
   * Required for file picker when using presigned URLs.
   */
  sirvAccount?: string

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
    /** Enable Sirv file picker. @default true */
    filePicker?: boolean
    /** Enable drag and drop. @default true */
    dragDrop?: boolean
    /** Enable clipboard paste. @default true */
    paste?: boolean
    /** Accept all asset types (images, videos, 3D, PDF). @default false */
    allAssets?: boolean
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

export interface UseFilePickerOptions {
  endpoint: string
  fileType?: 'image' | 'video' | 'all'
}

export interface UseFilePickerReturn {
  /** Current folder path */
  currentPath: string
  /** Items in current folder */
  items: BrowseItem[]
  /** Loading state */
  isLoading: boolean
  /** Error message */
  error: string | null
  /** Navigate to a folder */
  navigateTo: (path: string) => void
  /** Go up one folder */
  goUp: () => void
  /** Refresh current folder */
  refresh: () => void
  /** Search within current folder */
  search: (query: string) => void
  /** Select a file */
  selectFile: (item: BrowseItem) => void
  /** Selected files */
  selectedFiles: BrowseItem[]
  /** Clear selection */
  clearSelection: () => void
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
