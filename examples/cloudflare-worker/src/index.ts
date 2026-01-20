/**
 * Cloudflare Worker - Presigned URL Endpoint for Sirv
 *
 * Deploy with Wrangler:
 *   wrangler deploy
 *
 * wrangler.toml:
 * ```toml
 * name = "sirv-presign"
 * main = "src/index.ts"
 * compatibility_date = "2024-01-01"
 *
 * [vars]
 * SIRV_BUCKET = "your-account"
 *
 * # Set secrets with: wrangler secret put SIRV_S3_KEY
 * ```
 */

interface Env {
  SIRV_S3_KEY: string
  SIRV_S3_SECRET: string
  SIRV_BUCKET: string
  ALLOWED_ORIGINS?: string
}

interface PresignRequest {
  filename: string
  contentType: string
  folder?: string
  size?: number
}

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

// AWS Signature V4 implementation for presigned URLs
async function createPresignedUrl(
  accessKey: string,
  secretKey: string,
  bucket: string,
  key: string,
  expiresIn: number = 300
): Promise<string> {
  const region = 'us-east-1'
  const service = 's3'
  const host = 's3.sirv.com'
  const method = 'PUT'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const credential = `${accessKey}/${credentialScope}`

  // Canonical request components
  const canonicalUri = `/${bucket}/${key}`
  const signedHeaders = 'host'

  // Query parameters for presigned URL
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': signedHeaders,
  })

  // Sort query params
  queryParams.sort()
  const canonicalQueryString = queryParams.toString()

  // Canonical headers
  const canonicalHeaders = `host:${host}\n`

  // Create canonical request
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  // Create string to sign
  const canonicalRequestHash = await sha256Hex(canonicalRequest)
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  // Calculate signature
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service)
  const signature = await hmacHex(signingKey, stringToSign)

  // Build final URL
  queryParams.set('X-Amz-Signature', signature)
  return `https://${host}${canonicalUri}?${queryParams.toString()}`
}

// HMAC-SHA256
async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const sig = await hmac(key, data)
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// SHA-256 hash
async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Derive signing key
async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode('AWS4' + secretKey), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
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

    // Only accept POST to /presign
    if (request.method !== 'POST' || !url.pathname.endsWith('/presign')) {
      return new Response('Not Found', { status: 404, headers: corsHeaders })
    }

    try {
      const body: PresignRequest = await request.json()
      const { filename, contentType, folder = '/', size } = body

      // Validate required fields
      if (!filename || !contentType) {
        return Response.json(
          { error: 'Missing required fields: filename, contentType' },
          { status: 400, headers: corsHeaders }
        )
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (size && size > maxSize) {
        return Response.json(
          { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
          { status: 400, headers: corsHeaders }
        )
      }

      // Validate content type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'image/heic',
      ]
      if (!allowedTypes.includes(contentType)) {
        return Response.json(
          { error: `Invalid content type. Allowed: ${allowedTypes.join(', ')}` },
          { status: 400, headers: corsHeaders }
        )
      }

      // Build the key (path) for the file
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
      const key = cleanFolder ? `${cleanFolder}/${filename}` : filename

      // Generate presigned URL using our own implementation
      const uploadUrl = await createPresignedUrl(
        env.SIRV_S3_KEY,
        env.SIRV_S3_SECRET,
        env.SIRV_BUCKET,
        key,
        300 // 5 minutes
      )

      const publicUrl = `https://${env.SIRV_BUCKET}.sirv.com/${key}`

      return Response.json(
        {
          uploadUrl,
          publicUrl,
          path: '/' + key,
        },
        { headers: corsHeaders }
      )
    } catch (error) {
      console.error('Presign error:', error)
      return Response.json(
        { error: 'Failed to generate upload URL' },
        { status: 500, headers: corsHeaders }
      )
    }
  },
}

/**
 * Usage with the widget:
 *
 * <SirvUploader
 *   presignEndpoint="https://sirv-presign.your-account.workers.dev/presign"
 *   folder="/uploads"
 *   onUpload={(files) => console.log('Uploaded:', files)}
 * />
 */
