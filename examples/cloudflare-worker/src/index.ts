/**
 * Cloudflare Worker - Sirv Upload Proxy using REST API
 *
 * Uses Sirv's REST API instead of S3 for simpler, more reliable uploads.
 *
 * Deploy with Wrangler:
 *   wrangler deploy
 *
 * wrangler.toml:
 * ```toml
 * name = "sirv-upload"
 * main = "src/index.ts"
 * compatibility_date = "2024-01-01"
 *
 * # Set secrets with:
 * # wrangler secret put SIRV_CLIENT_ID
 * # wrangler secret put SIRV_CLIENT_SECRET
 * ```
 *
 * Get your API credentials from: https://my.sirv.com/#/account/settings/api
 */

interface Env {
  SIRV_CLIENT_ID: string
  SIRV_CLIENT_SECRET: string
  ALLOWED_ORIGINS?: string
}

interface UploadRequest {
  filename: string
  folder?: string
}

interface TokenResponse {
  token: string
  expiresIn: number
  scope: string[]
}

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null

// CORS headers helper
const getCorsHeaders = (origin: string | null, allowedOrigins?: string): HeadersInit => {
  if (!allowedOrigins) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    }
  }

  const allowed = allowedOrigins.split(',').map((o) => o.trim())
  const isAllowed = origin && allowed.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  }
}

// Get Sirv API token
async function getToken(clientId: string, clientSecret: string): Promise<string> {
  // Check cache
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const response = await fetch('https://api.sirv.com/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.status}`)
  }

  const data: TokenResponse = await response.json()

  // Cache token (expire 5 min early to be safe)
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + (data.expiresIn - 300) * 1000,
  }

  return data.token
}

// Upload file to Sirv
async function uploadToSirv(
  token: string,
  path: string,
  file: ArrayBuffer,
  contentType: string
): Promise<void> {
  const response = await fetch(`https://api.sirv.com/v2/files/upload?filename=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: file,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${response.status} - ${error}`)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin, env.ALLOWED_ORIGINS)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // POST /upload - Upload a file
    if (request.method === 'POST' && url.pathname.endsWith('/upload')) {
      try {
        // Get filename and folder from query params
        const filename = url.searchParams.get('filename')
        const folder = url.searchParams.get('folder') || '/'

        if (!filename) {
          return Response.json(
            { error: 'Missing filename query parameter' },
            { status: 400, headers: corsHeaders }
          )
        }

        const contentType = request.headers.get('Content-Type') || 'application/octet-stream'

        // Validate content type
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/avif',
          'image/heic',
          'image/svg+xml',
        ]
        if (!allowedTypes.some(t => contentType.startsWith(t))) {
          return Response.json(
            { error: `Invalid content type. Allowed: ${allowedTypes.join(', ')}` },
            { status: 400, headers: corsHeaders }
          )
        }

        // Build path
        const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
        const path = cleanFolder ? `/${cleanFolder}/${filename}` : `/${filename}`

        // Get token and upload
        const token = await getToken(env.SIRV_CLIENT_ID, env.SIRV_CLIENT_SECRET)
        const fileData = await request.arrayBuffer()

        await uploadToSirv(token, path, fileData, contentType)

        // Get account name from token info for public URL
        const tokenInfo = await fetch('https://api.sirv.com/v2/account', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const account = await tokenInfo.json() as { alias: string }

        return Response.json(
          {
            success: true,
            path,
            url: `https://${account.alias}.sirv.com${path}`,
          },
          { headers: corsHeaders }
        )
      } catch (error) {
        console.error('Upload error:', error)
        return Response.json(
          { error: error instanceof Error ? error.message : 'Upload failed' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  },
}

/**
 * Usage with the widget:
 *
 * The widget needs to be updated to use this proxy endpoint instead of presigned URLs.
 * For now, you can use it directly:
 *
 * const formData = new FormData()
 * formData.append('file', file)
 *
 * fetch('https://your-worker.workers.dev/upload?filename=test.jpg&folder=/uploads', {
 *   method: 'POST',
 *   body: file, // Raw file, not FormData
 *   headers: { 'Content-Type': file.type }
 * })
 */
