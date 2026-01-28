# @sirv/upload-widget

A React file upload widget for [Sirv CDN](https://sirv.com) with batch uploads, CSV/Excel import, Dropbox/Google Drive integration, and file browser.

## Features

- **Drag & drop** file upload with progress tracking
- **Clipboard paste** - paste images directly from clipboard (Ctrl/Cmd+V)
- **Staged uploads** - preview and edit files before uploading
- **Batch uploads** with configurable concurrency
- **CSV/Excel import** for bulk URL imports
- **Dropbox integration** - import files from Dropbox
- **Google Drive integration** - import files from Google Drive
- **Multi-format support** - images, videos, 3D models, PDFs
- **Sirv file picker** to browse existing files
- **HEIC/HEIF conversion** for iPhone photos
- **Dark mode** with automatic system preference detection
- **Customizable styling** via CSS variables
- **TypeScript** support with full type definitions

## Installation

```bash
npm install @igorvaryvoda/sirv-upload-widget
```

## Quick Start

### 1. Deploy the upload proxy

The widget uploads through a proxy that handles Sirv authentication. Deploy to Cloudflare Workers:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IgorVaryvoda/sirv-uploader/tree/main/examples/cloudflare-worker)

You'll need your Sirv API credentials from [Sirv Dashboard → Settings → API](https://my.sirv.com/#/account/settings/api).

### 2. Use the widget

```tsx
import { SirvUploader } from '@igorvaryvoda/sirv-upload-widget'
import '@igorvaryvoda/sirv-upload-widget/styles.css'

export default function UploadPage() {
  return (
    <SirvUploader
      proxyEndpoint="https://your-worker.workers.dev"
      folder="/uploads"
      onUpload={(files) => {
        console.log('Uploaded files:', files)
      }}
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `proxyEndpoint` | `string` | - | URL of your upload proxy (Cloudflare Worker) |
| `presignEndpoint` | `string` | - | Alternative: endpoint for presigned URLs |
| `folder` | `string` | `"/"` | Default upload folder |
| `onUpload` | `(files: SirvFile[]) => void` | - | Callback when files are uploaded |
| `onError` | `(error: string, file?: SirvFile) => void` | - | Callback on upload errors |
| `features` | `object` | - | Enable/disable features (see below) |
| `dropbox` | `DropboxConfig` | - | Dropbox integration config |
| `googleDrive` | `GoogleDriveConfig` | - | Google Drive integration config |
| `maxFiles` | `number` | `50` | Maximum files for batch upload |
| `maxFileSize` | `number` | `10485760` | Maximum file size in bytes |
| `autoUpload` | `boolean` | `true` | Start upload immediately on file selection |
| `concurrency` | `number` | `3` | Number of concurrent uploads |
| `disabled` | `boolean` | `false` | Disable the widget |
| `compact` | `boolean` | `false` | Compact mode for smaller spaces |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Color theme |
| `labels` | `object` | - | Custom labels for i18n |
| `className` | `string` | - | Custom CSS class |

### Features Object

```typescript
features?: {
  batch?: boolean      // Enable batch upload (default: true)
  csvImport?: boolean  // Enable CSV/Excel import (default: true)
  filePicker?: boolean // Enable Sirv file browser (default: true)
  dragDrop?: boolean   // Enable drag & drop (default: true)
  paste?: boolean      // Enable clipboard paste (default: true)
  allAssets?: boolean  // Accept videos, 3D, PDFs (default: false)
}
```

### Staged Mode (Review Before Upload)

Set `autoUpload={false}` to enable staged mode where users can review and edit files before uploading:

```tsx
<SirvUploader
  proxyEndpoint="https://your-worker.workers.dev"
  autoUpload={false}
  onUpload={(files) => console.log('Uploaded:', files)}
/>
```

In staged mode, files are shown in a grid with:
- Thumbnail previews (or type-specific placeholders for videos, 3D, PDFs)
- Edit and remove buttons
- "Add more" button
- Upload all button

### Dropbox Integration

```tsx
<SirvUploader
  proxyEndpoint="https://your-worker.workers.dev"
  dropbox={{
    appKey: 'your-dropbox-app-key'
  }}
/>
```

Get your Dropbox App Key from [Dropbox Developers](https://www.dropbox.com/developers/apps).

### Google Drive Integration

```tsx
<SirvUploader
  proxyEndpoint="https://your-worker.workers.dev"
  googleDrive={{
    clientId: 'your-google-client-id',
    apiKey: 'your-google-api-key',
    appId: 'your-google-app-id'
  }}
/>
```

Get your Google credentials from [Google Cloud Console](https://console.cloud.google.com).

### Multi-Format Support

Enable support for videos, 3D models, and PDFs:

```tsx
<SirvUploader
  proxyEndpoint="https://your-worker.workers.dev"
  features={{ allAssets: true }}
/>
```

Supported formats:
- **Images**: JPG, PNG, GIF, WebP, HEIC, AVIF, BMP, TIFF, SVG
- **Videos**: MP4, WebM, MOV, AVI, MKV
- **3D Models**: GLB, GLTF, OBJ, FBX, USDZ, STL
- **Documents**: PDF

## Dark Mode

The widget supports dark mode out of the box:

```tsx
// Auto (default) - follows system preference
<SirvUploader theme="auto" ... />

// Force light mode
<SirvUploader theme="light" ... />

// Force dark mode
<SirvUploader theme="dark" ... />
```

## Styling

Customize using CSS variables:

```css
.sirv-uploader {
  --sirv-primary: #0066cc;
  --sirv-primary-hover: #0052a3;
  --sirv-bg: #ffffff;
  --sirv-text: #1e293b;
  --sirv-border: #e2e8f0;
  --sirv-radius: 8px;
}
```

## Individual Components

Use individual components for custom layouts:

```tsx
import {
  DropZone,
  FileList,
  StagedFilesGrid,
  FilePicker,
  useSirvUpload,
  useDropboxChooser,
  useGoogleDrivePicker,
} from '@igorvaryvoda/sirv-upload-widget'
```

## TypeScript

Full TypeScript support:

```typescript
import type {
  SirvFile,
  SirvUploaderProps,
  DropboxConfig,
  GoogleDriveConfig,
  FileCategory,
} from '@igorvaryvoda/sirv-upload-widget'
```

## License

MIT
