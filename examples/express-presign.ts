/**
 * Express.js Example - Presigned URL Endpoint
 *
 * Install dependencies:
 *   npm install express @aws-sdk/client-s3 @aws-sdk/s3-request-presigner cors
 *
 * Environment variables needed:
 * - SIRV_S3_KEY: Your Sirv S3 access key
 * - SIRV_S3_SECRET: Your Sirv S3 secret key
 * - SIRV_BUCKET: Your Sirv bucket name
 */

import express from 'express'
import cors from 'cors'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const app = express()
app.use(cors())
app.use(express.json())

// Initialize S3 client with Sirv's endpoint
const s3 = new S3Client({
  endpoint: 'https://s3.sirv.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.SIRV_S3_KEY!,
    secretAccessKey: process.env.SIRV_S3_SECRET!,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.SIRV_BUCKET!

/**
 * POST /api/sirv/presign
 * Get a presigned URL for direct upload to Sirv
 */
app.post('/api/sirv/presign', async (req, res) => {
  try {
    const { filename, contentType, folder = '/', size } = req.body

    if (!filename || !contentType) {
      return res.status(400).json({
        error: 'Missing required fields: filename, contentType',
      })
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (size && size > maxSize) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      })
    }

    const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
    const key = cleanFolder ? `${cleanFolder}/${filename}` : filename

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }
    )

    const publicUrl = `https://${BUCKET}.sirv.com/${key}`

    res.json({
      uploadUrl,
      publicUrl,
      path: '/' + key,
    })
  } catch (error) {
    console.error('Presign error:', error)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
})

/**
 * GET /api/sirv/browse
 * List files and folders (for FilePicker component)
 */
app.get('/api/sirv/browse', async (req, res) => {
  try {
    const path = (req.query.path as string) || '/'
    const prefix = path === '/' ? '' : path.replace(/^\//, '') + '/'

    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      Delimiter: '/',
    })

    const response = await s3.send(command)

    const items = []

    // Add folders
    for (const folder of response.CommonPrefixes || []) {
      const name = folder.Prefix!.replace(prefix, '').replace(/\/$/, '')
      if (name) {
        items.push({
          name,
          path: '/' + folder.Prefix!.replace(/\/$/, ''),
          type: 'folder' as const,
        })
      }
    }

    // Add files
    for (const file of response.Contents || []) {
      const name = file.Key!.replace(prefix, '')
      if (name && !name.includes('/')) {
        items.push({
          name,
          path: '/' + file.Key!,
          type: 'file' as const,
          size: file.Size,
          mtime: file.LastModified?.toISOString(),
          thumbnail: `https://${BUCKET}.sirv.com/${file.Key}?w=120&h=90`,
        })
      }
    }

    res.json({
      success: true,
      path,
      items,
    })
  } catch (error) {
    console.error('Browse error:', error)
    res.status(500).json({ success: false, error: 'Failed to list files' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Sirv presign server running on port ${PORT}`)
})

/**
 * Usage with the widget:
 *
 * <SirvUploader
 *   presignEndpoint="http://localhost:3001/api/sirv/presign"
 *   proxyEndpoint="http://localhost:3001/api/sirv"
 *   folder="/uploads"
 *   onUpload={(files) => console.log('Uploaded:', files)}
 * />
 */
