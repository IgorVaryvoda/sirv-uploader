import * as react_jsx_runtime from 'react/jsx-runtime';

interface ImageDimensions {
    width: number;
    height: number;
}
type FileCategory = 'image' | 'video' | '3d' | 'pdf' | 'other';
interface SirvFile {
    id: string;
    file?: File;
    filename: string;
    previewUrl: string;
    sirvUrl?: string;
    sirvPath?: string;
    /** External URL (for Dropbox/Google Drive imports) */
    externalUrl?: string;
    /** Access token for external URL (for Google Drive) */
    externalAccessToken?: string;
    dimensions?: ImageDimensions;
    size?: number;
    /** File category for display purposes */
    fileCategory?: FileCategory;
    status: UploadStatus;
    progress: number;
    error?: string;
}
type UploadStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error' | 'conflict';
type ConflictResolution = 'overwrite' | 'rename' | 'skip';
interface ConflictInfo {
    file: SirvFile;
    existingPath: string;
    suggestedPath: string;
}
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
interface PresignRequest {
    /** Target filename */
    filename: string;
    /** Content type of the file */
    contentType: string;
    /** Target folder path (e.g., "/uploads/2024") */
    folder?: string;
    /** File size in bytes (for validation) */
    size?: number;
}
interface PresignResponse {
    /** Presigned URL to upload directly to Sirv S3 */
    uploadUrl: string;
    /** Public CDN URL where file will be accessible */
    publicUrl: string;
    /** Path on Sirv (e.g., "/uploads/2024/image.jpg") */
    path: string;
    /** Error message if failed */
    error?: string;
}
/**
 * For proxy mode, user's backend handles all Sirv operations.
 * Use this if you can't use presigned URLs or need more control.
 */
/** POST {endpoint}/upload - Upload a file to Sirv */
interface UploadRequest {
    /** Base64-encoded file data OR a URL to fetch */
    data: string;
    /** Target filename */
    filename: string;
    /** Target folder path (e.g., "/uploads/2024") */
    folder: string;
    /** Content type of the file */
    contentType: string;
    /** Conflict resolution strategy */
    onConflict?: ConflictResolution;
}
interface UploadResponse {
    success: boolean;
    /** Full Sirv URL of the uploaded file */
    url?: string;
    /** Path on Sirv (e.g., "/uploads/2024/image.jpg") */
    path?: string;
    /** Error message if failed */
    error?: string;
    /** True if file already exists */
    conflict?: boolean;
    /** Existing file path if conflict */
    existingPath?: string;
}
/** GET {endpoint}/browse?path=/folder - List files and folders */
interface BrowseRequest {
    /** Folder path to browse */
    path: string;
    /** Filter by type */
    type?: 'image' | 'video' | 'all';
    /** Search query */
    search?: string;
}
interface BrowseResponse {
    success: boolean;
    /** Current folder path */
    path: string;
    /** List of items in the folder */
    items?: BrowseItem[];
    error?: string;
}
interface BrowseItem {
    /** File or folder name */
    name: string;
    /** Full path */
    path: string;
    /** 'file' or 'folder' */
    type: 'file' | 'folder';
    /** File size in bytes (files only) */
    size?: number;
    /** MIME type (files only) */
    contentType?: string;
    /** Last modified date */
    mtime?: string;
    /** Thumbnail URL (images only) */
    thumbnail?: string;
}
/** DELETE {endpoint}/delete - Delete a file */
interface DeleteRequest {
    /** Path of file to delete */
    path: string;
}
interface DeleteResponse {
    success: boolean;
    error?: string;
}
/** POST {endpoint}/check - Check if file exists (optional) */
interface CheckRequest {
    /** Path to check */
    path: string;
}
interface CheckResponse {
    exists: boolean;
    /** Existing file info if exists */
    file?: BrowseItem;
}
interface DropboxConfig {
    /** Dropbox App Key - get from https://www.dropbox.com/developers/apps */
    appKey: string;
}
interface GoogleDriveConfig {
    /** Google OAuth Client ID */
    clientId: string;
    /** Google API Key (for Picker) */
    apiKey: string;
    /** Google App ID */
    appId: string;
}
interface SirvUploaderProps {
    /**
     * RECOMMENDED: Endpoint to get presigned upload URLs.
     * Widget will POST { filename, contentType, folder } and expect { uploadUrl, publicUrl, path }
     * Then upload directly to Sirv's S3 endpoint.
     *
     * Your backend just needs to call AWS SDK's getSignedUrl with Sirv's S3 endpoint.
     */
    presignEndpoint?: string;
    /**
     * ALTERNATIVE: Base URL for full proxy endpoint.
     * Use this if you can't use presigned URLs.
     * The widget will call:
     * - POST {endpoint}/upload (with file data)
     * - GET {endpoint}/browse
     * - DELETE {endpoint}/delete
     */
    proxyEndpoint?: string;
    /**
     * Sirv account/bucket name (e.g., "myaccount" for myaccount.sirv.com)
     * Required for file picker when using presigned URLs.
     */
    sirvAccount?: string;
    /**
     * Default folder to upload files to.
     * @default "/"
     */
    folder?: string;
    /**
     * Callback when files are uploaded successfully.
     */
    onUpload?: (files: SirvFile[]) => void;
    /**
     * Callback when upload fails.
     */
    onError?: (error: string, file?: SirvFile) => void;
    /**
     * Callback when files are selected (before upload).
     */
    onSelect?: (files: SirvFile[]) => void;
    /**
     * Callback when a file is removed from the queue.
     */
    onRemove?: (file: SirvFile) => void;
    /**
     * Feature flags to enable/disable parts of the widget.
     */
    features?: {
        /** Enable batch/multi-file upload. @default true */
        batch?: boolean;
        /** Enable CSV/Excel import tab. @default true */
        csvImport?: boolean;
        /** Enable Sirv file picker. @default true */
        filePicker?: boolean;
        /** Enable drag and drop. @default true */
        dragDrop?: boolean;
        /** Enable clipboard paste. @default true */
        paste?: boolean;
        /** Accept all asset types (images, videos, 3D, PDF). @default false */
        allAssets?: boolean;
    };
    /**
     * Dropbox integration configuration.
     * Omit to disable Dropbox import.
     */
    dropbox?: DropboxConfig;
    /**
     * Google Drive integration configuration.
     * Omit to disable Google Drive import.
     */
    googleDrive?: GoogleDriveConfig;
    /**
     * Maximum number of files for batch upload.
     * @default 50
     */
    maxFiles?: number;
    /**
     * Maximum file size in bytes.
     * @default 10485760 (10MB)
     */
    maxFileSize?: number;
    /**
     * Accepted file types (MIME types or extensions).
     * @default ["image/*"]
     */
    accept?: string[];
    /**
     * How to handle filename conflicts.
     * - 'ask': Show modal to let user decide
     * - 'overwrite': Always overwrite
     * - 'rename': Always rename with suffix
     * - 'skip': Skip conflicting files
     * @default 'rename'
     */
    onConflict?: ConflictResolution | 'ask';
    /**
     * Auto-upload files immediately after selection.
     * Set to false to show staged files grid before upload.
     * @default true
     */
    autoUpload?: boolean;
    /**
     * Number of concurrent uploads.
     * @default 3
     */
    concurrency?: number;
    /**
     * Custom class name for the container.
     */
    className?: string;
    /**
     * Disable the entire widget.
     */
    disabled?: boolean;
    /**
     * Compact mode for smaller spaces.
     */
    compact?: boolean;
    /**
     * Color theme.
     * - 'auto': Follow system preference (default)
     * - 'light': Force light mode
     * - 'dark': Force dark mode
     * @default 'auto'
     */
    theme?: 'auto' | 'light' | 'dark';
    /**
     * Custom labels for i18n.
     */
    labels?: Partial<SirvUploaderLabels>;
    /**
     * Children to render inside the dropzone (for custom trigger).
     */
    children?: React.ReactNode;
}
interface SirvUploaderLabels {
    dropzone: string;
    dropzoneHint: string;
    pasteHint: string;
    browse: string;
    uploadFiles: string;
    importUrls: string;
    selectFromSirv: string;
    importFromDropbox: string;
    importFromGoogleDrive: string;
    uploading: string;
    processing: string;
    success: string;
    error: string;
    retry: string;
    remove: string;
    edit: string;
    addMore: string;
    clearAll: string;
    upload: string;
    cancel: string;
    overwrite: string;
    rename: string;
    skip: string;
    conflictTitle: string;
    conflictMessage: string;
    filesSelected: string;
}
interface UseSirvUploadOptions$1 {
    endpoint: string;
    folder: string;
    onConflict: ConflictResolution | 'ask';
    concurrency: number;
    autoUpload: boolean;
    maxFileSize: number;
    onUpload?: (files: SirvFile[]) => void;
    onError?: (error: string, file?: SirvFile) => void;
}
interface UseSirvUploadReturn$1 {
    /** Current files in the queue */
    files: SirvFile[];
    /** Add files to the queue */
    addFiles: (files: File[]) => void;
    /** Add URLs (from CSV/spreadsheet) */
    addUrls: (urls: string[]) => void;
    /** Remove a file from the queue */
    removeFile: (id: string) => void;
    /** Clear all files */
    clearFiles: () => void;
    /** Start uploading all pending files */
    uploadAll: () => Promise<void>;
    /** Upload a single file */
    uploadFile: (id: string) => Promise<void>;
    /** Retry a failed upload */
    retryFile: (id: string) => Promise<void>;
    /** Cancel an in-progress upload */
    cancelUpload: (id: string) => void;
    /** Resolve a conflict */
    resolveConflict: (id: string, resolution: ConflictResolution) => void;
    /** Current conflict needing resolution (if onConflict='ask') */
    currentConflict: ConflictInfo | null;
    /** Overall upload progress (0-100) */
    progress: number;
    /** True if any uploads are in progress */
    isUploading: boolean;
    /** True if all files have been uploaded */
    isComplete: boolean;
}
interface UseFilePickerOptions {
    endpoint: string;
    fileType?: 'image' | 'video' | 'all';
}
interface UseFilePickerReturn {
    /** Current folder path */
    currentPath: string;
    /** Items in current folder */
    items: BrowseItem[];
    /** Loading state */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Navigate to a folder */
    navigateTo: (path: string) => void;
    /** Go up one folder */
    goUp: () => void;
    /** Refresh current folder */
    refresh: () => void;
    /** Search within current folder */
    search: (query: string) => void;
    /** Select a file */
    selectFile: (item: BrowseItem) => void;
    /** Selected files */
    selectedFiles: BrowseItem[];
    /** Clear selection */
    clearSelection: () => void;
}
interface ParsedUrl {
    url: string;
    path: string;
    valid: boolean;
    error?: string;
}
interface CsvParseOptions {
    /** Column name or index containing URLs */
    column?: string | number;
    /** Skip header row */
    hasHeader?: boolean;
    /** Validate URLs */
    validate?: boolean;
}
interface CsvParseResult {
    headers: string[];
    urls: ParsedUrl[];
    totalCount: number;
    validCount: number;
    invalidCount: number;
}

declare function SirvUploader({ presignEndpoint, proxyEndpoint, sirvAccount, folder, onUpload, onError, onSelect, onRemove, features, dropbox, googleDrive, maxFiles, maxFileSize, accept, onConflict, autoUpload, concurrency, className, disabled, compact, theme, labels: customLabels, children, }: SirvUploaderProps): react_jsx_runtime.JSX.Element;

interface DropZoneProps {
    onFiles: (files: SirvFile[]) => void;
    onSpreadsheet?: (file: File) => void;
    accept?: string[];
    maxFiles?: number;
    maxFileSize?: number;
    disabled?: boolean;
    compact?: boolean;
    /** Enable clipboard paste support */
    enablePaste?: boolean;
    /** Accept all asset types (images, videos, 3D, PDF) */
    acceptAllAssets?: boolean;
    className?: string;
    labels?: {
        dropzone?: string;
        dropzoneHint?: string;
        browse?: string;
        pasteHint?: string;
    };
    children?: React.ReactNode;
}
declare function DropZone({ onFiles, onSpreadsheet, accept, maxFiles, maxFileSize, disabled, compact, enablePaste, acceptAllAssets, className, labels, children, }: DropZoneProps): react_jsx_runtime.JSX.Element;

interface FileListProps {
    files: SirvFile[];
    onRemove?: (id: string) => void;
    onRetry?: (id: string) => void;
    showThumbnails?: boolean;
    className?: string;
    labels?: {
        retry?: string;
        remove?: string;
        uploading?: string;
        processing?: string;
        success?: string;
        error?: string;
    };
}
declare function FileList({ files, onRemove, onRetry, showThumbnails, className, labels, }: FileListProps): react_jsx_runtime.JSX.Element | null;
interface FileListSummaryProps {
    files: SirvFile[];
    className?: string;
}
declare function FileListSummary({ files, className }: FileListSummaryProps): react_jsx_runtime.JSX.Element | null;

interface StagedFilesGridProps {
    files: SirvFile[];
    onRemove: (id: string) => void;
    onEdit?: (file: SirvFile) => void;
    onAddMore?: (files: SirvFile[]) => void;
    maxFiles?: number;
    accept?: string;
    disabled?: boolean;
    showFilenames?: boolean;
    className?: string;
    labels?: {
        addMore?: string;
        edit?: string;
        remove?: string;
    };
}
declare function StagedFilesGrid({ files, onRemove, onEdit, onAddMore, maxFiles, accept, disabled, showFilenames, className, labels, }: StagedFilesGridProps): react_jsx_runtime.JSX.Element;

interface FilePickerProps {
    endpoint: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (items: BrowseItem[]) => void;
    fileType?: 'image' | 'video' | 'all';
    multiple?: boolean;
    initialPath?: string;
    className?: string;
    labels?: {
        title?: string;
        select?: string;
        cancel?: string;
        search?: string;
        empty?: string;
        loading?: string;
        error?: string;
    };
}
declare function FilePicker({ endpoint, isOpen, onClose, onSelect, fileType, multiple, initialPath, className, labels, }: FilePickerProps): react_jsx_runtime.JSX.Element | null;

interface SpreadsheetImportProps {
    onUrls: (urls: string[]) => void;
    className?: string;
    labels?: {
        drop?: string;
        hint?: string;
        validUrls?: string;
        invalidUrls?: string;
        import?: string;
        clear?: string;
    };
}
declare function SpreadsheetImport({ onUrls, className, labels, }: SpreadsheetImportProps): react_jsx_runtime.JSX.Element;

interface UseSirvUploadOptions {
    /** Endpoint to get presigned URLs (recommended) */
    presignEndpoint?: string;
    /** Full proxy endpoint (alternative) */
    proxyEndpoint?: string;
    /** Default upload folder */
    folder: string;
    /** Conflict resolution strategy */
    onConflict: ConflictResolution | 'ask';
    /** Max concurrent uploads */
    concurrency: number;
    /** Auto-upload on file add */
    autoUpload: boolean;
    /** Max file size */
    maxFileSize: number;
    /** Callback on successful uploads */
    onUpload?: (files: SirvFile[]) => void;
    /** Callback on errors */
    onError?: (error: string, file?: SirvFile) => void;
}
interface UseSirvUploadReturn {
    files: SirvFile[];
    addFiles: (newFiles: SirvFile[]) => void;
    addUrls: (urls: string[]) => void;
    removeFile: (id: string) => void;
    clearFiles: () => void;
    uploadAll: () => Promise<void>;
    uploadFile: (id: string) => Promise<void>;
    retryFile: (id: string) => Promise<void>;
    cancelUpload: (id: string) => void;
    progress: number;
    isUploading: boolean;
    isComplete: boolean;
}
declare function useSirvUpload(options: UseSirvUploadOptions): UseSirvUploadReturn;

declare global {
    interface Window {
        Dropbox?: {
            choose: (options: DropboxChooserOptions) => void;
            isBrowserSupported: () => boolean;
        };
    }
}
interface DropboxChooserOptions {
    success: (files: DropboxFile[]) => void;
    cancel?: () => void;
    linkType: 'preview' | 'direct';
    multiselect: boolean;
    extensions?: string[];
    folderselect?: boolean;
    sizeLimit?: number;
}
interface DropboxFile {
    id: string;
    name: string;
    link: string;
    bytes: number;
    icon: string;
    thumbnailLink?: string;
    isDir: boolean;
}
interface UseDropboxChooserOptions {
    /** Dropbox App Key - get from https://www.dropbox.com/developers/apps */
    appKey: string;
    /** Callback when files are selected */
    onSelect: (files: DropboxFile[]) => void;
    /** Callback when picker is cancelled */
    onCancel?: () => void;
    /** Allow multiple file selection */
    multiselect?: boolean;
    /** File extensions to filter by */
    extensions?: string[];
    /** Max file size in bytes */
    maxSizeBytes?: number;
}
declare function useDropboxChooser({ appKey, onSelect, onCancel, multiselect, extensions, maxSizeBytes, }: UseDropboxChooserOptions): {
    /** Open the Dropbox file chooser */
    openChooser: () => void;
    /** Loading state */
    isLoading: boolean;
    /** Whether Dropbox is supported in this browser */
    isSupported: boolean;
    /** Whether the picker is configured and ready to use */
    isConfigured: boolean;
    /** Whether the SDK has finished loading */
    isReady: boolean;
};

declare global {
    interface Window {
        gapi?: {
            load: (api: string, callback: () => void) => void;
            client?: {
                init: (config: {
                    apiKey?: string;
                    discoveryDocs?: string[];
                }) => Promise<void>;
            };
            auth2?: {
                getAuthInstance: () => {
                    isSignedIn: {
                        get: () => boolean;
                    };
                    signIn: (options?: {
                        scope?: string;
                    }) => Promise<{
                        getAuthResponse: () => {
                            access_token: string;
                        };
                    }>;
                    currentUser: {
                        get: () => {
                            getAuthResponse: () => {
                                access_token: string;
                            };
                        };
                    };
                };
            };
        };
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: {
                            access_token?: string;
                            error?: string;
                            expires_in?: number;
                        }) => void;
                    }) => {
                        requestAccessToken: () => void;
                    };
                };
            };
            picker?: {
                PickerBuilder: new () => GooglePickerBuilder;
                ViewId: {
                    DOCS: string;
                };
                DocsView: new (viewId?: string) => GoogleDocsView;
                Action: {
                    PICKED: string;
                    CANCEL: string;
                };
                Feature: {
                    MULTISELECT_ENABLED: number;
                };
            };
        };
    }
}
interface GooglePickerBuilder {
    addView: (view: GoogleDocsView) => GooglePickerBuilder;
    setOAuthToken: (token: string) => GooglePickerBuilder;
    setDeveloperKey: (key: string) => GooglePickerBuilder;
    setAppId: (appId: string) => GooglePickerBuilder;
    setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
    enableFeature: (feature: number) => GooglePickerBuilder;
    setOrigin: (origin: string) => GooglePickerBuilder;
    build: () => {
        setVisible: (visible: boolean) => void;
    };
}
interface GoogleDocsView {
    setMimeTypes: (types: string) => GoogleDocsView;
}
interface GooglePickerResponse {
    action: string;
    docs?: GoogleDriveFile[];
}
interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes?: number;
    url?: string;
    iconUrl?: string;
    thumbnails?: Array<{
        url: string;
        width?: number;
        height?: number;
    }>;
}
interface UseGoogleDrivePickerOptions {
    /** Google OAuth Client ID */
    clientId: string;
    /** Google API Key (for Picker) */
    apiKey: string;
    /** Google App ID */
    appId: string;
    /** Callback when files are selected */
    onSelect: (files: GoogleDriveFile[], accessToken: string) => void;
    /** Callback when picker is cancelled */
    onCancel?: () => void;
    /** Allow multiple file selection */
    multiselect?: boolean;
    /** MIME types to filter (comma-separated) */
    mimeTypes?: string;
}
declare function useGoogleDrivePicker({ clientId, apiKey, appId, onSelect, onCancel, multiselect, mimeTypes, }: UseGoogleDrivePickerOptions): {
    /** Open the Google Drive picker */
    openPicker: () => Promise<void>;
    /** Loading state */
    isLoading: boolean;
    /** Whether all APIs are loaded and ready */
    isReady: boolean;
    /** Whether the picker is configured */
    isConfigured: boolean;
    /** Whether we have a stored session */
    hasSession: boolean;
    /** Clear stored session to force re-authentication */
    clearSession: () => void;
};

/**
 * File utility functions for the Sirv Upload Widget
 */
declare const ACCEPTED_IMAGE_FORMATS = "image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/avif,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.heic,.heif,.avif,.svg";
declare const ACCEPTED_VIDEO_FORMATS = "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv,.m4v,.ogv";
declare const ACCEPTED_3D_FORMATS = "model/gltf-binary,model/gltf+json,.glb,.gltf,.obj,.fbx,.usdz,.stl";
declare const ACCEPTED_ALL_FORMATS = "image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/avif,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.heic,.heif,.avif,.svg,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv,.m4v,.ogv,model/gltf-binary,model/gltf+json,.glb,.gltf,.obj,.fbx,.usdz,.stl,application/pdf,.pdf";
declare const DEFAULT_MAX_FILE_SIZE: number;
declare function isImageFile(file: File): boolean;
declare function isSvgFile(file: File): boolean;
declare function isVideoFile(file: File): boolean;
declare function is3DModelFile(file: File): boolean;
declare function isPdfFile(file: File): boolean;
/**
 * Check if a file can have a visual preview generated
 */
declare function canPreviewFile(file: File): boolean;
/**
 * Get the file category for display purposes
 */
declare function getFileCategory(file: File): 'image' | 'video' | '3d' | 'pdf' | 'other';
declare function isHeifFile(file: File): boolean;
/**
 * Convert HEIC with multiple fallback strategies:
 * 1. Client-side heic2any library
 * 2. Browser native support via canvas (Safari)
 * 3. Optional server-side endpoint
 */
declare function convertHeicWithFallback(file: File, serverEndpoint?: string): Promise<File>;
declare function generateId(): string;
declare function validateFileSize(file: File, maxSize?: number): {
    valid: boolean;
    error?: string;
};
declare function getImageDimensions(file: File): Promise<{
    width: number;
    height: number;
} | null>;
declare function formatFileSize(bytes: number): string;
declare function getMimeType(file: File): string;

declare const DELIMITERS: readonly [",", "\t", ";", "|"];
type CsvDelimiter = (typeof DELIMITERS)[number];
/**
 * Detect the delimiter used in CSV content by analyzing the first few lines
 */
declare function detectDelimiter(csvContent: string): CsvDelimiter;
interface ParsedUrlItem {
    url: string;
    path: string;
    valid: boolean;
    error?: string;
}
/**
 * Validate a URL - customizable validator
 */
type UrlValidator = (url: string) => {
    valid: boolean;
    error?: string;
};
declare const defaultUrlValidator: UrlValidator;
declare const sirvUrlValidator: UrlValidator;
interface ClientParseResult {
    headers: string[];
    sampleRows: string[][];
    rowCount: number;
    estimatedImageCounts: number[];
    urls: ParsedUrlItem[];
    validCount: number;
    invalidCount: number;
    totalCount: number;
}
interface ParseOptions {
    column?: string;
    previewOnly?: boolean;
    validator?: UrlValidator;
}
/**
 * Parse CSV content client-side with preview and URL extraction
 */
declare function parseCsvClient(csvContent: string, options?: ParseOptions): ClientParseResult;
/**
 * Parse Excel file client-side with preview and URL extraction
 */
declare function parseExcelClient(arrayBuffer: ArrayBuffer, options?: ParseOptions): Promise<ClientParseResult>;
/**
 * Detect if a file is a spreadsheet type
 */
declare function isSpreadsheetFile(file: File): boolean;

export { ACCEPTED_3D_FORMATS, ACCEPTED_ALL_FORMATS, ACCEPTED_IMAGE_FORMATS, ACCEPTED_VIDEO_FORMATS, type BrowseItem, type BrowseRequest, type BrowseResponse, type CheckRequest, type CheckResponse, type ClientParseResult, type ConflictInfo, type ConflictResolution, type CsvParseOptions, type CsvParseResult, DEFAULT_MAX_FILE_SIZE, type DeleteRequest, type DeleteResponse, DropZone, type DropZoneProps, type DropboxConfig, type DropboxFile, type FileCategory, FileList, type FileListProps, FileListSummary, FilePicker, type FilePickerProps, type GoogleDriveConfig, type GoogleDriveFile, type ImageDimensions, type ParsedUrl, type ParsedUrlItem, type PresignRequest, type PresignResponse, type SirvFile, SirvUploader, type SirvUploaderLabels, type SirvUploaderProps, SpreadsheetImport, type SpreadsheetImportProps, StagedFilesGrid, type StagedFilesGridProps, type UploadRequest, type UploadResponse, type UploadStatus, type UrlValidator, type UseDropboxChooserOptions, type UseFilePickerOptions, type UseFilePickerReturn, type UseGoogleDrivePickerOptions, type UseSirvUploadOptions$1 as UseSirvUploadOptions, type UseSirvUploadReturn$1 as UseSirvUploadReturn, canPreviewFile, convertHeicWithFallback, defaultUrlValidator, detectDelimiter, formatFileSize, generateId, getFileCategory, getImageDimensions, getMimeType, is3DModelFile, isHeifFile, isImageFile, isPdfFile, isSpreadsheetFile, isSvgFile, isVideoFile, parseCsvClient, parseExcelClient, sirvUrlValidator, useDropboxChooser, useGoogleDrivePicker, useSirvUpload, validateFileSize };
