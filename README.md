# @sirv/upload-widget

A React file upload widget for [Sirv CDN](https://sirv.com) with batch uploads, CSV/Excel import, and file browser.

## Features

- **Drag & drop** file upload with progress tracking
- **Batch uploads** with configurable concurrency
- **CSV/Excel import** for bulk URL imports
- **Sirv file picker** to browse existing files
- **HEIC/HEIF conversion** for iPhone photos
- **Dark mode** with automatic system preference detection
- **Customizable styling** via CSS variables
- **TypeScript** support with full type definitions

## Installation

```bash
npm install @sirv/upload-widget
```

## Quick Start

### 1. Deploy the upload proxy

The widget uploads through a proxy that handles Sirv authentication. Deploy to Cloudflare Workers:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IgorVaryvoda/sirv-uploader/tree/main/examples/cloudflare-worker)

You'll need your Sirv API credentials from [Sirv Dashboard → Settings → API](https://my.sirv.com/#/account/settings/api).

### 2. Use the widget

```tsx
import { SirvUploader } from '@sirv/upload-widget'
import '@sirv/upload-widget/styles.css'

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
| `folder` | `string` | `"/"` | Default upload folder |
| `onUpload` | `(files: SirvFile[]) => void` | - | Callback when files are uploaded |
| `onError` | `(error: string, file?: SirvFile) => void` | - | Callback on upload errors |
| `features` | `object` | - | Enable/disable features (see below) |
| `maxFiles` | `number` | `50` | Maximum files for batch upload |
| `maxFileSize` | `number` | `10485760` | Maximum file size in bytes |
| `autoUpload` | `boolean` | `true` | Start upload immediately on file selection |
| `concurrency` | `number` | `3` | Number of concurrent uploads |
| `disabled` | `boolean` | `false` | Disable the widget |
| `compact` | `boolean` | `false` | Compact mode for smaller spaces |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Color theme (auto follows system preference) |
| `labels` | `object` | - | Custom labels for i18n |
| `className` | `string` | - | Custom CSS class |

### Features Object

```typescript
features?: {
  batch?: boolean      // Enable batch upload (default: true)
  csvImport?: boolean  // Enable CSV/Excel import (default: true)
  filePicker?: boolean // Enable Sirv file browser (default: true)
  dragDrop?: boolean   // Enable drag & drop (default: true)
}
```

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

## Self-hosting the Proxy

If you prefer to self-host, the proxy is a simple Cloudflare Worker:

```typescript
// See examples/cloudflare-worker/src/index.ts
```

Required environment variables:
- `SIRV_CLIENT_ID` - API Client ID from Sirv
- `SIRV_CLIENT_SECRET` - API Client Secret from Sirv

## TypeScript

Full TypeScript support:

```typescript
import type { SirvFile, SirvUploaderProps } from '@sirv/upload-widget'
```

## License

MIT
