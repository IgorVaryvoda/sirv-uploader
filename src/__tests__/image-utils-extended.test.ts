import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isImageFile,
  isSvgFile,
  isVideoFile,
  is3DModelFile,
  isPdfFile,
  canPreviewFile,
  getFileCategory,
  isHeifFile,
  detectHeicByMagicBytes,
  generateId,
  validateFileSize,
  isValidUrl,
  getImageDimensions,
  formatFileSize,
  getFileExtension,
  getMimeType,
  ACCEPTED_IMAGE_FORMATS,
  ACCEPTED_VIDEO_FORMATS,
  ACCEPTED_3D_FORMATS,
  ACCEPTED_ALL_FORMATS,
} from '../utils/image-utils'

describe('image-utils extended', () => {
  describe('File Type Detection', () => {
    describe('isImageFile', () => {
      it('should detect JPEG files by type', () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect PNG files by type', () => {
        const file = new File([''], 'test.png', { type: 'image/png' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect WebP files by type', () => {
        const file = new File([''], 'test.webp', { type: 'image/webp' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect GIF files by type', () => {
        const file = new File([''], 'test.gif', { type: 'image/gif' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect HEIC files by type', () => {
        const file = new File([''], 'test.heic', { type: 'image/heic' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect AVIF files by type', () => {
        const file = new File([''], 'test.avif', { type: 'image/avif' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect images by extension when type is empty', () => {
        const file = new File([''], 'test.jpg', { type: '' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect TIFF files', () => {
        const file = new File([''], 'test.tiff', { type: 'image/tiff' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should detect BMP files', () => {
        const file = new File([''], 'test.bmp', { type: 'image/bmp' })
        expect(isImageFile(file)).toBe(true)
      })

      it('should NOT detect SVG as image (separate check)', () => {
        const file = new File([''], 'test.svg', { type: 'image/svg+xml' })
        expect(isImageFile(file)).toBe(false)
      })

      it('should NOT detect video files', () => {
        const file = new File([''], 'test.mp4', { type: 'video/mp4' })
        expect(isImageFile(file)).toBe(false)
      })

      it('should NOT detect PDF files', () => {
        const file = new File([''], 'test.pdf', { type: 'application/pdf' })
        expect(isImageFile(file)).toBe(false)
      })
    })

    describe('isSvgFile', () => {
      it('should detect SVG by type', () => {
        const file = new File([''], 'icon.svg', { type: 'image/svg+xml' })
        expect(isSvgFile(file)).toBe(true)
      })

      it('should detect SVG by extension', () => {
        const file = new File([''], 'icon.svg', { type: '' })
        expect(isSvgFile(file)).toBe(true)
      })

      it('should NOT detect PNG as SVG', () => {
        const file = new File([''], 'icon.png', { type: 'image/png' })
        expect(isSvgFile(file)).toBe(false)
      })
    })

    describe('isVideoFile', () => {
      it('should detect MP4 files', () => {
        const file = new File([''], 'video.mp4', { type: 'video/mp4' })
        expect(isVideoFile(file)).toBe(true)
      })

      it('should detect WebM files', () => {
        const file = new File([''], 'video.webm', { type: 'video/webm' })
        expect(isVideoFile(file)).toBe(true)
      })

      it('should detect MOV files', () => {
        const file = new File([''], 'video.mov', { type: 'video/quicktime' })
        expect(isVideoFile(file)).toBe(true)
      })

      it('should detect AVI files by extension', () => {
        const file = new File([''], 'video.avi', { type: '' })
        expect(isVideoFile(file)).toBe(true)
      })

      it('should detect MKV files by extension', () => {
        const file = new File([''], 'video.mkv', { type: '' })
        expect(isVideoFile(file)).toBe(true)
      })

      it('should NOT detect images', () => {
        const file = new File([''], 'image.jpg', { type: 'image/jpeg' })
        expect(isVideoFile(file)).toBe(false)
      })
    })

    describe('is3DModelFile', () => {
      it('should detect GLB files', () => {
        const file = new File([''], 'model.glb', { type: '' })
        expect(is3DModelFile(file)).toBe(true)
      })

      it('should detect GLTF files', () => {
        const file = new File([''], 'model.gltf', { type: '' })
        expect(is3DModelFile(file)).toBe(true)
      })

      it('should detect OBJ files', () => {
        const file = new File([''], 'model.obj', { type: '' })
        expect(is3DModelFile(file)).toBe(true)
      })

      it('should detect FBX files', () => {
        const file = new File([''], 'model.fbx', { type: '' })
        expect(is3DModelFile(file)).toBe(true)
      })

      it('should detect USDZ files', () => {
        const file = new File([''], 'model.usdz', { type: '' })
        expect(is3DModelFile(file)).toBe(true)
      })

      it('should detect STL files', () => {
        const file = new File([''], 'model.stl', { type: '' })
        expect(is3DModelFile(file)).toBe(true)
      })

      it('should NOT detect images', () => {
        const file = new File([''], 'image.jpg', { type: 'image/jpeg' })
        expect(is3DModelFile(file)).toBe(false)
      })
    })

    describe('isPdfFile', () => {
      it('should detect PDF by type', () => {
        const file = new File([''], 'doc.pdf', { type: 'application/pdf' })
        expect(isPdfFile(file)).toBe(true)
      })

      it('should detect PDF by extension', () => {
        const file = new File([''], 'doc.pdf', { type: '' })
        expect(isPdfFile(file)).toBe(true)
      })

      it('should NOT detect other files', () => {
        const file = new File([''], 'doc.docx', { type: 'application/msword' })
        expect(isPdfFile(file)).toBe(false)
      })
    })

    describe('canPreviewFile', () => {
      it('should return true for images', () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        expect(canPreviewFile(file)).toBe(true)
      })

      it('should return false for SVG', () => {
        const file = new File([''], 'test.svg', { type: 'image/svg+xml' })
        expect(canPreviewFile(file)).toBe(false)
      })

      it('should return false for video', () => {
        const file = new File([''], 'test.mp4', { type: 'video/mp4' })
        expect(canPreviewFile(file)).toBe(false)
      })
    })

    describe('getFileCategory', () => {
      it('should return "image" for images', () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        expect(getFileCategory(file)).toBe('image')
      })

      it('should return "image" for SVG', () => {
        const file = new File([''], 'test.svg', { type: 'image/svg+xml' })
        expect(getFileCategory(file)).toBe('image')
      })

      it('should return "video" for videos', () => {
        const file = new File([''], 'test.mp4', { type: 'video/mp4' })
        expect(getFileCategory(file)).toBe('video')
      })

      it('should return "3d" for 3D models', () => {
        const file = new File([''], 'test.glb', { type: '' })
        expect(getFileCategory(file)).toBe('3d')
      })

      it('should return "pdf" for PDFs', () => {
        const file = new File([''], 'test.pdf', { type: 'application/pdf' })
        expect(getFileCategory(file)).toBe('pdf')
      })

      it('should return "other" for unknown types', () => {
        const file = new File([''], 'test.xyz', { type: '' })
        expect(getFileCategory(file)).toBe('other')
      })
    })
  })

  describe('HEIC Detection', () => {
    describe('isHeifFile', () => {
      it('should detect HEIC by type', () => {
        const file = new File([''], 'photo.heic', { type: 'image/heic' })
        expect(isHeifFile(file)).toBe(true)
      })

      it('should detect HEIF by type', () => {
        const file = new File([''], 'photo.heif', { type: 'image/heif' })
        expect(isHeifFile(file)).toBe(true)
      })

      it('should detect HEIC by extension', () => {
        const file = new File([''], 'photo.heic', { type: '' })
        expect(isHeifFile(file)).toBe(true)
      })

      it('should detect HEIF by extension', () => {
        const file = new File([''], 'photo.HEIF', { type: '' })
        expect(isHeifFile(file)).toBe(true)
      })

      it('should NOT detect JPEG as HEIC', () => {
        const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
        expect(isHeifFile(file)).toBe(false)
      })
    })

    describe('detectHeicByMagicBytes', () => {
      it('should return false for non-HEIC files', async () => {
        const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
        const result = await detectHeicByMagicBytes(file)
        expect(result).toBe(false)
      })

      it('should return false for empty files', async () => {
        const file = new File([''], 'test.heic', { type: 'image/heic' })
        const result = await detectHeicByMagicBytes(file)
        expect(result).toBe(false)
      })

      it('should return false for small files', async () => {
        const file = new File(['tiny'], 'test.heic', { type: 'image/heic' })
        const result = await detectHeicByMagicBytes(file)
        expect(result).toBe(false)
      })
    })
  })

  describe('Utility Functions', () => {
    describe('generateId', () => {
      it('should generate unique IDs', () => {
        const id1 = generateId()
        const id2 = generateId()
        expect(id1).not.toBe(id2)
      })

      it('should include timestamp', () => {
        const before = Date.now()
        const id = generateId()
        const after = Date.now()

        const timestamp = parseInt(id.split('-')[0])
        expect(timestamp).toBeGreaterThanOrEqual(before)
        expect(timestamp).toBeLessThanOrEqual(after)
      })

      it('should be a string', () => {
        expect(typeof generateId()).toBe('string')
      })
    })

    describe('validateFileSize', () => {
      it('should return valid for files under limit', () => {
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        const result = validateFileSize(file, 1024 * 1024)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should return invalid for files over limit', () => {
        const content = new Array(1024).fill('x').join('')
        const file = new File([content], 'test.jpg', { type: 'image/jpeg' })
        const result = validateFileSize(file, 100)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('File too large')
      })

      it('should use default max size', () => {
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        const result = validateFileSize(file)
        expect(result.valid).toBe(true)
      })
    })

    describe('isValidUrl', () => {
      it('should return true for valid HTTP URL', () => {
        expect(isValidUrl('https://example.com/image.jpg')).toBe(true)
      })

      it('should return true for valid HTTPS URL', () => {
        expect(isValidUrl('https://example.com/image.jpg')).toBe(true)
      })

      it('should return false for invalid URL', () => {
        expect(isValidUrl('not-a-url')).toBe(false)
      })

      it('should return false for null', () => {
        expect(isValidUrl(null)).toBe(false)
      })

      it('should return false for undefined', () => {
        expect(isValidUrl(undefined)).toBe(false)
      })

      it('should return false for empty string', () => {
        expect(isValidUrl('')).toBe(false)
      })
    })

    describe('formatFileSize', () => {
      it('should format bytes', () => {
        expect(formatFileSize(500)).toBe('500 B')
      })

      it('should format kilobytes', () => {
        expect(formatFileSize(1024)).toBe('1.0 KB')
      })

      it('should format megabytes', () => {
        expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      })

      it('should format large sizes', () => {
        expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB')
      })
    })

    describe('getFileExtension', () => {
      it('should extract extension', () => {
        expect(getFileExtension('test.jpg')).toBe('jpg')
      })

      it('should handle multiple dots', () => {
        expect(getFileExtension('my.file.name.png')).toBe('png')
      })

      it('should return lowercase', () => {
        expect(getFileExtension('test.JPG')).toBe('jpg')
      })

      it('should return empty for no extension', () => {
        expect(getFileExtension('noextension')).toBe('')
      })
    })

    describe('getMimeType', () => {
      it('should return file type if available', () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        expect(getMimeType(file)).toBe('image/jpeg')
      })

      it('should infer from extension for jpg', () => {
        const file = new File([''], 'test.jpg', { type: '' })
        expect(getMimeType(file)).toBe('image/jpeg')
      })

      it('should infer from extension for png', () => {
        const file = new File([''], 'test.png', { type: '' })
        expect(getMimeType(file)).toBe('image/png')
      })

      it('should infer from extension for gif', () => {
        const file = new File([''], 'test.gif', { type: '' })
        expect(getMimeType(file)).toBe('image/gif')
      })

      it('should infer from extension for webp', () => {
        const file = new File([''], 'test.webp', { type: '' })
        expect(getMimeType(file)).toBe('image/webp')
      })

      it('should infer from extension for heic', () => {
        const file = new File([''], 'test.heic', { type: '' })
        expect(getMimeType(file)).toBe('image/heic')
      })

      it('should return octet-stream for unknown', () => {
        const file = new File([''], 'test.xyz', { type: '' })
        expect(getMimeType(file)).toBe('application/octet-stream')
      })
    })

    describe('getImageDimensions', () => {
      it('should handle image files', async () => {
        // Mock URL APIs
        const originalCreateObjectURL = global.URL.createObjectURL
        const originalRevokeObjectURL = global.URL.revokeObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:test')
        global.URL.revokeObjectURL = vi.fn()

        // Mock Image class
        const OriginalImage = global.Image
        global.Image = class MockImage {
          onload: (() => void) | null = null
          onerror: (() => void) | null = null
          src = ''
          naturalWidth = 100
          naturalHeight = 100

          constructor() {
            setTimeout(() => {
              if (this.onload) this.onload()
            }, 0)
          }
        } as unknown as typeof Image

        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        const result = await getImageDimensions(file)
        expect(result).toEqual({ width: 100, height: 100 })

        // Restore
        global.Image = OriginalImage
        global.URL.createObjectURL = originalCreateObjectURL
        global.URL.revokeObjectURL = originalRevokeObjectURL
      })
    })
  })

  describe('Format Constants', () => {
    it('should have image formats', () => {
      expect(ACCEPTED_IMAGE_FORMATS).toContain('image/jpeg')
      expect(ACCEPTED_IMAGE_FORMATS).toContain('image/png')
      expect(ACCEPTED_IMAGE_FORMATS).toContain('image/webp')
      expect(ACCEPTED_IMAGE_FORMATS).toContain('image/heic')
    })

    it('should have video formats', () => {
      expect(ACCEPTED_VIDEO_FORMATS).toContain('video/mp4')
      expect(ACCEPTED_VIDEO_FORMATS).toContain('video/webm')
    })

    it('should have 3D formats', () => {
      expect(ACCEPTED_3D_FORMATS).toContain('.glb')
      expect(ACCEPTED_3D_FORMATS).toContain('.gltf')
    })

    it('should have all formats combined', () => {
      expect(ACCEPTED_ALL_FORMATS).toContain('image/jpeg')
      expect(ACCEPTED_ALL_FORMATS).toContain('video/mp4')
      expect(ACCEPTED_ALL_FORMATS).toContain('.glb')
      expect(ACCEPTED_ALL_FORMATS).toContain('application/pdf')
    })
  })
})
