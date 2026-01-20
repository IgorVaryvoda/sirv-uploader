// =============================================================================
// @sirv/upload-widget - React file upload widget for Sirv CDN
// =============================================================================

// Main component
export { SirvUploader } from './components/SirvUploader'

// Individual components (for custom layouts)
export { DropZone } from './components/DropZone'
export { FileList, FileListSummary } from './components/FileList'
export { FilePicker } from './components/FilePicker'
export { SpreadsheetImport } from './components/SpreadsheetImport'

// Hooks
export { useSirvUpload } from './hooks/useSirvUpload'

// Utilities
export {
  isImageFile,
  isHeifFile,
  convertHeicWithFallback,
  validateFileSize,
  generateId,
  getImageDimensions,
  formatFileSize,
  getMimeType,
  ACCEPTED_IMAGE_FORMATS,
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
export type { FilePickerProps } from './components/FilePicker'
export type { SpreadsheetImportProps } from './components/SpreadsheetImport'
export type { ClientParseResult, ParsedUrlItem, UrlValidator } from './utils/csv-parser'
