/**
 * Next.js API Route Example - Presigned URL Endpoint
 *
 * This is all your backend needs to support the SirvUploader widget.
 * Put this file at: app/api/sirv/presign/route.ts
 *
 * Environment variables needed:
 * - SIRV_S3_KEY: Your Sirv S3 access key
 * - SIRV_S3_SECRET: Your Sirv S3 secret key
 * - SIRV_BUCKET: Your Sirv bucket name (usually your account name)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'

// Initialize S3 client with Sirv's endpoint
const s3 = new S3Client({
  endpoint: 'https://s3.sirv.com',
  region: 'us-east-1', // Sirv doesn't use regions, but AWS SDK requires this
  credentials: {
    accessKeyId: process.env.SIRV_S3_KEY!,
    secretAccessKey: process.env.SIRV_S3_SECRET!,
  },
  forcePathStyle: true, // Required for Sirv
})

const BUCKET = process.env.SIRV_BUCKET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, contentType, folder = '/', size } = body

    // Validate required fields
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, contentType' },
        { status: 400 }
      )
    }

    // Optional: Validate file size (10MB default)
    const maxSize = 10 * 1024 * 1024
    if (size && size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Optional: Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid content type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Build the key (path) for the file
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    const key = cleanFolder ? `${cleanFolder}/${filename}` : filename

    // Generate presigned URL (valid for 5 minutes)
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }
    )

    // Build the public URL where the file will be accessible
    const publicUrl = `https://${BUCKET}.sirv.com/${key}`

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      path: '/' + key,
    })
  } catch (error) {
    console.error('Presign error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}

/**
 * Usage in your React component:
 *
 * import { SirvUploader } from '@sirv/upload-widget'
 * import '@sirv/upload-widget/styles.css'
 *
 * export default function UploadPage() {
 *   return (
 *     <SirvUploader
 *       presignEndpoint="/api/sirv/presign"
 *       folder="/uploads"
 *       onUpload={(files) => console.log('Uploaded:', files)}
 *     />
 *   )
 * }
 */
