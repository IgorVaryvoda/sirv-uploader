# Sirv Upload Worker

A Cloudflare Worker that proxies uploads to Sirv CDN using the REST API.

## Deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IgorVaryvoda/sirv-uploader/tree/main/examples/cloudflare-worker)

During deployment, you'll be prompted for:
- **SIRV_CLIENT_ID** - API Client ID
- **SIRV_CLIENT_SECRET** - API Client Secret

Get your API credentials from [Sirv Dashboard → Settings → API](https://my.sirv.com/#/account/settings/api).

## Manual Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/IgorVaryvoda/sirv-uploader.git
   cd sirv-uploader/examples/cloudflare-worker
   npm install
   ```

2. **Set secrets:**
   ```bash
   wrangler secret put SIRV_CLIENT_ID
   wrangler secret put SIRV_CLIENT_SECRET
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## Usage

```tsx
import { SirvUploader } from '@sirv/upload-widget'

<SirvUploader
  proxyEndpoint="https://sirv-upload.YOUR-SUBDOMAIN.workers.dev"
  folder="/uploads"
/>
```

## Local Development

1. Copy `.dev.vars.example` to `.dev.vars` and fill in your credentials
2. Run `npm run dev`
3. Use `http://localhost:8787` as your endpoint

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIRV_CLIENT_ID` | Yes | Sirv API Client ID |
| `SIRV_CLIENT_SECRET` | Yes | Sirv API Client Secret |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed origins for CORS |
