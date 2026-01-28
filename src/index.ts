// =============================================================================
// @sirv/upload-widget - React file upload widget for Sirv CDN
// =============================================================================

// Main component
export { SirvUploader } from './components/SirvUploader'

// Individual components (for custom layouts)
export { DropZone } from './components/DropZone'
export { FileList, FileListSummary } from './components/FileList'
export { StagedFilesGrid } from './components/StagedFilesGrid'
export { FilePicker } from './components/FilePicker'
export { SpreadsheetImport } from './components/SpreadsheetImport'

// Hooks
export { useSirvUpload } from './hooks/useSirvUpload'
export { useDropboxChooser } from './hooks/useDropboxChooser'
export { useGoogleDrivePicker } from './hooks/useGoogleDrivePicker'

// Utilities
export {
  isImageFile,
  isVideoFile,
  is3DModelFile,
  isPdfFile,
  isSvgFile,
  canPreviewFile,
  getFileCategory,
  isHeifFile,
  convertHeicWithFallback,
  validateFileSize,
  generateId,
  getImageDimensions,
  formatFileSize,
  getMimeType,
  ACCEPTED_IMAGE_FORMATS,
  ACCEPTED_VIDEO_FORMATS,
  ACCEPTED_3D_FORMATS,
  ACCEPTED_ALL_FORMATS,
  DEFAULT_MAX_FILE_SIZE,
} from './utils/image-utils'

export {
  parseCsvClient,
  parseExcelClient,
  isSpreadsheetFile,
  detectDelimiter,
  defaultUrlValidator,
  sirvUrlValidator,
} from './utils/csv-parser'

// Types
export type {
  // Core types
  SirvFile,
  FileCategory,
  ImageDimensions,
  UploadStatus,
  ConflictResolution,
  ConflictInfo,

  // Presigned URL mode (recommended)
  PresignRequest,
  PresignResponse,

  // Proxy mode
  UploadRequest,
  UploadResponse,
  BrowseRequest,
  BrowseResponse,
  BrowseItem,
  DeleteRequest,
  DeleteResponse,
  CheckRequest,
  CheckResponse,

  // Component props
  SirvUploaderProps,
  SirvUploaderLabels,
  DropboxConfig,
  GoogleDriveConfig,

  // Hook types
  UseSirvUploadOptions,
  UseSirvUploadReturn,
  UseFilePickerOptions,
  UseFilePickerReturn,

  // Utility types
  ParsedUrl,
  CsvParseOptions,
  CsvParseResult,
} from './types'

export type { DropZoneProps } from './components/DropZone'
export type { FileListProps } from './components/FileList'
export type { StagedFilesGridProps } from './components/StagedFilesGrid'
export type { FilePickerProps } from './components/FilePicker'
export type { SpreadsheetImportProps } from './components/SpreadsheetImport'
export type { DropboxFile, UseDropboxChooserOptions } from './hooks/useDropboxChooser'
export type { GoogleDriveFile, UseGoogleDrivePickerOptions } from './hooks/useGoogleDrivePicker'
export type { ClientParseResult, ParsedUrlItem, UrlValidator } from './utils/csv-parser'
