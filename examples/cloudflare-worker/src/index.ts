/**
 * Cloudflare Worker Example - Presigned URL Endpoint
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

import { AwsClient } from 'aws4fetch'

interface Env {
  SIRV_S3_KEY: string
  SIRV_S3_SECRET: string
  SIRV_BUCKET: string
  // Optional: restrict to specific origins
  ALLOWED_ORIGINS?: string
}

interface PresignRequest {
  filename: string
  contentType: string
  folder?: string
  size?: number
}

// CORS headers
const corsHeaders = (origin: string, allowedOrigins?: string) => {
  const allowed = allowedOrigins?.split(',').map(o => o.trim()) || ['*']
  const isAllowed = allowed.includes('*') || allowed.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || '*'

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin, env.ALLOWED_ORIGINS),
      })
    }

    // Only accept POST to /presign
    if (request.method !== 'POST' || !url.pathname.endsWith('/presign')) {
      return new Response('Not Found', { status: 404 })
    }

    try {
      const body: PresignRequest = await request.json()
      const { filename, contentType, folder = '/', size } = body

      // Validate required fields
      if (!filename || !contentType) {
        return Response.json(
          { error: 'Missing required fields: filename, contentType' },
          { status: 400, headers: corsHeaders(origin, env.ALLOWED_ORIGINS) }
        )
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (size && size > maxSize) {
        return Response.json(
          { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
          { status: 400, headers: corsHeaders(origin, env.ALLOWED_ORIGINS) }
        )
      }

      // Validate content type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'image/webp', 'image/avif', 'image/heic'
      ]
      if (!allowedTypes.includes(contentType)) {
        return Response.json(
          { error: `Invalid content type. Allowed: ${allowedTypes.join(', ')}` },
          { status: 400, headers: corsHeaders(origin, env.ALLOWED_ORIGINS) }
        )
      }

      // Build the key (path) for the file
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
      const key = cleanFolder ? `${cleanFolder}/${filename}` : filename

      // Create AWS client for Sirv's S3 endpoint
      const aws = new AwsClient({
        accessKeyId: env.SIRV_S3_KEY,
        secretAccessKey: env.SIRV_S3_SECRET,
        service: 's3',
        region: 'us-east-1',
      })

      // Generate presigned URL (valid for 5 minutes)
      const s3Url = new URL(`https://s3.sirv.com/${env.SIRV_BUCKET}/${key}`)
      const expiresIn = 300

      // Sign the request
      const signedRequest = await aws.sign(s3Url.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        aws: {
          signQuery: true,
          expiresIn,
        },
      })

      const uploadUrl = signedRequest.url
      const publicUrl = `https://${env.SIRV_BUCKET}.sirv.com/${key}`

      return Response.json(
        {
          uploadUrl,
          publicUrl,
          path: '/' + key,
        },
        { headers: corsHeaders(origin, env.ALLOWED_ORIGINS) }
      )
    } catch (error) {
      console.error('Presign error:', error)
      return Response.json(
        { error: 'Failed to generate upload URL' },
        { status: 500, headers: corsHeaders(origin, env.ALLOWED_ORIGINS) }
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
 *
 * Dependencies (package.json):
 * {
 *   "dependencies": {
 *     "aws4fetch": "^1.0.18"
 *   }
 * }
 */
