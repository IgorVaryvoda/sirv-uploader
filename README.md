# @sirv/upload-widget

A React file upload widget for [Sirv CDN](https://sirv.com) with batch uploads, CSV/Excel import, and file browser.

## Features

- **Drag & drop** file upload with progress tracking
- **Batch uploads** with configurable concurrency
- **CSV/Excel import** for bulk URL imports
- **Sirv file picker** to browse existing files
- **HEIC/HEIF conversion** for iPhone photos
- **Presigned URL support** for secure direct uploads
- **Customizable styling** via CSS variables
- **TypeScript** support with full type definitions

## Installation

```bash
npm install @sirv/upload-widget
# or
yarn add @sirv/upload-widget
# or
pnpm add @sirv/upload-widget
```

## Quick Start

### 1. Create a presign endpoint on your backend

The widget uploads directly to Sirv using presigned URLs. Your backend just needs one endpoint:

```typescript
// app/api/sirv/presign/route.ts (Next.js)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  endpoint: 'https://s3.sirv.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.SIRV_S3_KEY!,
    secretAccessKey: process.env.SIRV_S3_SECRET!,
  },
  forcePathStyle: true,
})

export async function POST(req: Request) {
  const { filename, contentType, folder } = await req.json()
  const key = `${folder}/${filename}`.replace(/^\/+/, '')

  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.SIRV_BUCKET!,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: 300 })

  return Response.json({
    uploadUrl,
    publicUrl: `https://${process.env.SIRV_BUCKET}.sirv.com/${key}`,
    path: '/' + key,
  })
}
```

### 2. Use the widget in your React app

```tsx
import { SirvUploader } from '@sirv/upload-widget'
import '@sirv/upload-widget/styles.css'

export default function UploadPage() {
  return (
    <SirvUploader
      presignEndpoint="/api/sirv/presign"
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
| `presignEndpoint` | `string` | - | **Recommended.** URL to get presigned upload URLs |
| `proxyEndpoint` | `string` | - | Alternative: URL for full proxy mode |
| `folder` | `string` | `"/"` | Default upload folder |
| `onUpload` | `(files: SirvFile[]) => void` | - | Callback when files are uploaded |
| `onError` | `(error: string, file?: SirvFile) => void` | - | Callback on upload errors |
| `features` | `object` | - | Enable/disable features (see below) |
| `maxFiles` | `number` | `50` | Maximum files for batch upload |
| `maxFileSize` | `number` | `10485760` | Maximum file size in bytes |
| `autoUpload` | `boolean` | `true` | Start upload immediately on file selection |
| `concurrency` | `number` | `3` | Number of concurrent uploads |
| `onConflict` | `'overwrite' \| 'rename' \| 'skip' \| 'ask'` | `'rename'` | Filename conflict handling |
| `disabled` | `boolean` | `false` | Disable the widget |
| `compact` | `boolean` | `false` | Compact mode for smaller spaces |
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

## Styling

Customize the widget using CSS variables:

```css
.sirv-uploader {
  --sirv-primary: #0066cc;
  --sirv-primary-hover: #0052a3;
  --sirv-bg: #ffffff;
  --sirv-text: #1e293b;
  --sirv-border: #e2e8f0;
  --sirv-radius: 8px;
  /* ... see styles.css for all variables */
}
```

## Individual Components

For custom layouts, you can use the components individually:

```tsx
import {
  DropZone,
  FileList,
  FilePicker,
  SpreadsheetImport,
  useSirvUpload,
} from '@sirv/upload-widget'
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  SirvFile,
  SirvUploaderProps,
  PresignRequest,
  PresignResponse,
} from '@sirv/upload-widget'
```

## Backend Examples

See the `/examples` folder for:
- `nextjs-presign.ts` - Next.js API route
- `express-presign.ts` - Express.js server

## How It Works

1. User selects files in the widget
2. Widget requests a presigned URL from your backend
3. Your backend generates the URL using AWS SDK with Sirv's S3 endpoint
4. Widget uploads directly to Sirv using the presigned URL
5. File is available at `https://youraccount.sirv.com/path/to/file.jpg`

This approach keeps your Sirv credentials secure on the server while allowing fast, direct uploads from the browser.

## License

MIT
