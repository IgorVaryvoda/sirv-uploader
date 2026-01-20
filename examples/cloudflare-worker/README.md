# Sirv Upload Presign Worker

A Cloudflare Worker that generates presigned URLs for direct uploads to Sirv CDN.

## Deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IgorVaryvoda/sirv-uploader/tree/main/examples/cloudflare-worker)

During deployment, you'll be prompted for:
- **SIRV_BUCKET** - Your Sirv account name (e.g., `mycompany`)
- **SIRV_S3_KEY** - S3 Access Key
- **SIRV_S3_SECRET** - S3 Secret Key

Get your S3 credentials from [Sirv Dashboard → Settings → S3 API](https://my.sirv.com/#/account/settings/api).

## Manual Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/IgorVaryvoda/sirv-uploader.git
   cd sirv-uploader/examples/cloudflare-worker
   npm install
   ```

2. **Configure wrangler.toml:**
   ```toml
   [vars]
   SIRV_BUCKET = "your-sirv-account"
   ```

3. **Set secrets:**
   ```bash
   wrangler secret put SIRV_S3_KEY
   wrangler secret put SIRV_S3_SECRET
   ```

   Get your S3 credentials from [Sirv Dashboard → Settings → S3 API](https://my.sirv.com/#/account/settings/api)

4. **Deploy:**
   ```bash
   npm run deploy
   ```

## Usage

```tsx
import { SirvUploader } from '@sirv/upload-widget'

<SirvUploader
  presignEndpoint="https://sirv-upload-presign.YOUR-SUBDOMAIN.workers.dev/presign"
  folder="/uploads"
/>
```

## Local Development

```bash
npm run dev
```

Then use `http://localhost:8787/presign` as your endpoint.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIRV_S3_KEY` | Yes | Sirv S3 Access Key (set as secret) |
| `SIRV_S3_SECRET` | Yes | Sirv S3 Secret Key (set as secret) |
| `SIRV_BUCKET` | Yes | Your Sirv account name |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed origins for CORS |
