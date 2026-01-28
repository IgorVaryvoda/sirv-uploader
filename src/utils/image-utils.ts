/**
 * File utility functions for the Sirv Upload Widget
 */

const HEIC_TYPES = ['image/heic', 'image/heif']
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif|svg)$/i
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i
const MODEL_3D_EXTENSIONS = /\.(glb|gltf|obj|fbx|usdz|stl)$/i
const PDF_EXTENSION = /\.pdf$/i

export const ACCEPTED_IMAGE_FORMATS =
  'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/avif,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.heic,.heif,.avif,.svg'

export const ACCEPTED_VIDEO_FORMATS =
  'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv,.m4v,.ogv'

export const ACCEPTED_3D_FORMATS =
  'model/gltf-binary,model/gltf+json,.glb,.gltf,.obj,.fbx,.usdz,.stl'

export const ACCEPTED_ALL_FORMATS =
  `${ACCEPTED_IMAGE_FORMATS},${ACCEPTED_VIDEO_FORMATS},${ACCEPTED_3D_FORMATS},application/pdf,.pdf`

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/') && !file.type.includes('svg')) return true
  if (IMAGE_EXTENSIONS.test(file.name) && !file.name.toLowerCase().endsWith('.svg')) return true
  return false
}

export function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true
  if (VIDEO_EXTENSIONS.test(file.name)) return true
  return false
}

export function is3DModelFile(file: File): boolean {
  const ext = file.name.toLowerCase().split('.').pop()
  return MODEL_3D_EXTENSIONS.test(file.name) || ['glb', 'gltf', 'obj', 'fbx', 'usdz', 'stl'].includes(ext || '')
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || PDF_EXTENSION.test(file.name)
}

/**
 * Check if a file can have a visual preview generated
 */
export function canPreviewFile(file: File): boolean {
  return isImageFile(file) && !isSvgFile(file)
}

/**
 * Get the file category for display purposes
 */
export function getFileCategory(file: File): 'image' | 'video' | '3d' | 'pdf' | 'other' {
  if (isImageFile(file) || isSvgFile(file)) return 'image'
  if (isVideoFile(file)) return 'video'
  if (is3DModelFile(file)) return '3d'
  if (isPdfFile(file)) return 'pdf'
  return 'other'
}

export function isHeifFile(file: File): boolean {
  if (HEIC_TYPES.includes(file.type.toLowerCase())) return true
  if (/\.(heic|heif)$/i.test(file.name)) return true
  return false
}

export async function detectHeicByMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer()
    const view = new DataView(buffer)

    if (view.byteLength < 12) return false

    const ftypOffset = 4
    const ftyp = String.fromCharCode(
      view.getUint8(ftypOffset),
      view.getUint8(ftypOffset + 1),
      view.getUint8(ftypOffset + 2),
      view.getUint8(ftypOffset + 3)
    )

    if (ftyp !== 'ftyp') return false

    const brand = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    )

    const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']
    return heicBrands.includes(brand.toLowerCase())
  } catch {
    return false
  }
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default
  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  })
  const resultBlob = Array.isArray(blob) ? blob[0] : blob

  if (!resultBlob || resultBlob.size === 0) {
    throw new Error('HEIC conversion produced empty result')
  }

  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg') || 'converted.jpg'
  return new File([resultBlob], newName.endsWith('.jpg') ? newName : `${newName}.jpg`, {
    type: 'image/jpeg',
  })
}

/**
 * Convert HEIC with multiple fallback strategies:
 * 1. Client-side heic2any library
 * 2. Browser native support via canvas (Safari)
 * 3. Optional server-side endpoint
 */
export async function convertHeicWithFallback(
  file: File,
  serverEndpoint?: string
): Promise<File> {
  // Try 1: Client-side heic2any library
  try {
    return await convertHeicToJpeg(file)
  } catch (primaryError) {
    console.warn('Primary HEIC conversion (heic2any) failed:', primaryError)

    // Try 2: Browser native support via canvas (Safari only)
    try {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Canvas not supported')

      const objectUrl = URL.createObjectURL(file)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Browser cannot decode HEIC natively'))
        img.src = objectUrl
      })

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      URL.revokeObjectURL(objectUrl)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      })

      if (!blob || blob.size === 0) {
        throw new Error('Canvas conversion produced empty result')
      }

      const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg') || 'converted.jpg'
      return new File([blob], newName.endsWith('.jpg') ? newName : `${newName}.jpg`, {
        type: 'image/jpeg',
      })
    } catch (canvasError) {
      console.warn('Canvas fallback failed:', canvasError)

      // Try 3: Server-side conversion if endpoint provided
      if (serverEndpoint) {
        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch(serverEndpoint, {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`)
          }

          const { dataUrl, filename } = await response.json()
          const base64Data = dataUrl.split(',')[1]
          const binaryString = atob(base64Data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: 'image/jpeg' })

          return new File([blob], filename, { type: 'image/jpeg' })
        } catch (serverError) {
          console.warn('Server-side HEIC conversion failed:', serverError)
        }
      }

      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError)
      throw new Error(
        `Unable to convert HEIC image (${primaryMsg}). Please export as JPEG from your Photos app.`
      )
    }
  }
}

export function generateId(): string {
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  const randomPart = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${Date.now()}-${randomPart}`
}

export function validateFileSize(
  file: File,
  maxSize: number = DEFAULT_MAX_FILE_SIZE
): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB`,
    }
  }
  return { valid: true }
}

export function isValidUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

export function getMimeType(file: File): string {
  if (file.type) return file.type

  const ext = getFileExtension(file.name)
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    heic: 'image/heic',
    heif: 'image/heif',
  }

  return mimeTypes[ext] || 'application/octet-stream'
}
