import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DropZone } from '../components/DropZone'

describe('DropZone', () => {
  const defaultProps = {
    onFiles: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render with default content', () => {
      render(<DropZone {...defaultProps} />)
      expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
    })

    it('should render custom labels', () => {
      render(
        <DropZone
          {...defaultProps}
          labels={{
            dropzone: 'Upload your images',
            dropzoneHint: 'PNG and JPG only',
          }}
        />
      )
      expect(screen.getByText('Upload your images')).toBeInTheDocument()
      expect(screen.getByText('PNG and JPG only')).toBeInTheDocument()
    })

    it('should render children when provided', () => {
      render(
        <DropZone {...defaultProps}>
          <span>Custom content</span>
        </DropZone>
      )
      expect(screen.getByText('Custom content')).toBeInTheDocument()
    })

    it('should hide hint in compact mode', () => {
      render(<DropZone {...defaultProps} compact />)
      expect(screen.queryByText(/supports jpg/i)).not.toBeInTheDocument()
    })

    it('should show paste hint when enabled', () => {
      render(<DropZone {...defaultProps} enablePaste />)
      expect(screen.getByText(/paste images from clipboard/i)).toBeInTheDocument()
    })

    it('should hide paste hint when disabled', () => {
      render(<DropZone {...defaultProps} enablePaste={false} />)
      expect(screen.queryByText(/paste images from clipboard/i)).not.toBeInTheDocument()
    })

    it('should apply disabled state', () => {
      const { container } = render(<DropZone {...defaultProps} disabled />)
      expect(container.querySelector('.sirv-dropzone--disabled')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<DropZone {...defaultProps} className="custom-class" />)
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })

    it('should show allAssets hint when enabled', () => {
      render(<DropZone {...defaultProps} acceptAllAssets />)
      expect(screen.getByText(/supports images, videos, 3d models/i)).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('should show drag over state', () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      fireEvent.dragOver(dropzone)
      expect(container.querySelector('.sirv-dropzone--drag-over')).toBeInTheDocument()
    })

    it('should remove drag over state on leave', () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      fireEvent.dragOver(dropzone)
      expect(container.querySelector('.sirv-dropzone--drag-over')).toBeInTheDocument()

      fireEvent.dragLeave(dropzone)
      expect(container.querySelector('.sirv-dropzone--drag-over')).not.toBeInTheDocument()
    })

    it('should not show drag over state when disabled', () => {
      const { container } = render(<DropZone {...defaultProps} disabled />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      fireEvent.dragOver(dropzone)
      expect(container.querySelector('.sirv-dropzone--drag-over')).not.toBeInTheDocument()
    })

    it('should remove drag over state on drop', async () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      fireEvent.dragOver(dropzone)
      expect(container.querySelector('.sirv-dropzone--drag-over')).toBeInTheDocument()

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

      expect(container.querySelector('.sirv-dropzone--drag-over')).not.toBeInTheDocument()
    })

    it('should not process files when disabled', async () => {
      const onFiles = vi.fn()
      const { container } = render(<DropZone onFiles={onFiles} disabled />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onFiles).not.toHaveBeenCalled()
      })
    })

    it('should not have multiple attribute when maxFiles is 1', () => {
      const { container } = render(<DropZone {...defaultProps} maxFiles={1} />)
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(input.multiple).toBe(false)
    })
  })

  describe('File Input', () => {
    it('should open file dialog on click', () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const dropzone = container.querySelector('.sirv-dropzone')!
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = vi.spyOn(input, 'click')
      fireEvent.click(dropzone)
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should not open file dialog when disabled', () => {
      const { container } = render(<DropZone {...defaultProps} disabled />)
      const dropzone = container.querySelector('.sirv-dropzone')!
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = vi.spyOn(input, 'click')
      fireEvent.click(dropzone)
      expect(clickSpy).not.toHaveBeenCalled()
    })

    it('should open file dialog on Enter key', () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const dropzone = container.querySelector('.sirv-dropzone')!
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = vi.spyOn(input, 'click')
      fireEvent.keyDown(dropzone, { key: 'Enter' })
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should open file dialog on Space key', () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const dropzone = container.querySelector('.sirv-dropzone')!
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = vi.spyOn(input, 'click')
      fireEvent.keyDown(dropzone, { key: ' ' })
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should have correct accept attribute for images', () => {
      const { container } = render(<DropZone {...defaultProps} accept={['image/png', 'image/jpeg']} />)
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(input.accept).toBe('image/png,image/jpeg')
    })

    it('should have multiple attribute when maxFiles > 1', () => {
      const { container } = render(<DropZone {...defaultProps} maxFiles={10} />)
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(input.multiple).toBe(true)
    })

    it('should not have multiple attribute when maxFiles is 1', () => {
      const { container } = render(<DropZone {...defaultProps} maxFiles={1} />)
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(input.multiple).toBe(false)
    })

    it('should reset input value after change', () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      // Simulate setting a value
      Object.defineProperty(input, 'value', { writable: true, value: 'test.jpg' })

      fireEvent.change(input)

      // Value should be reset to empty string
      expect(input.value).toBe('')
    })
  })

  describe('Spreadsheet Files', () => {
    it('should call onSpreadsheet for CSV files', async () => {
      const onSpreadsheet = vi.fn()
      const { container } = render(<DropZone {...defaultProps} onSpreadsheet={onSpreadsheet} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      const file = new File(['url\nhttps://example.com'], 'data.csv', { type: 'text/csv' })
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onSpreadsheet).toHaveBeenCalledWith(file)
      })
    })

    it('should call onSpreadsheet for Excel files', async () => {
      const onSpreadsheet = vi.fn()
      const { container } = render(<DropZone {...defaultProps} onSpreadsheet={onSpreadsheet} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      const file = new File([''], 'data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onSpreadsheet).toHaveBeenCalledWith(file)
      })
    })
  })

  describe('File Type Filtering', () => {
    it('should accept video files when acceptAllAssets is true', async () => {
      const onFiles = vi.fn()
      const { container } = render(<DropZone onFiles={onFiles} acceptAllAssets />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      const file = new File(['video'], 'video.mp4', { type: 'video/mp4' })
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onFiles).toHaveBeenCalled()
        const processedFiles = onFiles.mock.calls[0][0]
        expect(processedFiles[0].filename).toBe('video.mp4')
      })
    })

    it('should accept PDF files when acceptAllAssets is true', async () => {
      const onFiles = vi.fn()
      const { container } = render(<DropZone onFiles={onFiles} acceptAllAssets />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' })
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onFiles).toHaveBeenCalled()
      })
    })

    it('should accept 3D model files when acceptAllAssets is true', async () => {
      const onFiles = vi.fn()
      const { container } = render(<DropZone onFiles={onFiles} acceptAllAssets />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      const file = new File(['model'], 'model.glb', { type: 'model/gltf-binary' })
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onFiles).toHaveBeenCalled()
      })
    })

    it('should reject non-image files when acceptAllAssets is false', async () => {
      const onFiles = vi.fn()
      const { container } = render(<DropZone onFiles={onFiles} acceptAllAssets={false} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' })
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onFiles).not.toHaveBeenCalled()
      })
    })
  })

  describe('File Size Validation', () => {
    it('should mark oversized files with error status', async () => {
      const onFiles = vi.fn()
      const { container } = render(<DropZone onFiles={onFiles} maxFileSize={100} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      // Create a file larger than maxFileSize
      const largeContent = new Array(200).fill('x').join('')
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(onFiles).toHaveBeenCalled()
        const processedFiles = onFiles.mock.calls[0][0]
        expect(processedFiles[0].status).toBe('error')
        expect(processedFiles[0].error).toContain('File too large')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<DropZone {...defaultProps} />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      expect(dropzone.getAttribute('role')).toBe('button')
      expect(dropzone.getAttribute('tabIndex')).toBe('0')
      expect(dropzone.getAttribute('aria-label')).toBeTruthy()
    })

    it('should have tabIndex -1 when disabled', () => {
      const { container } = render(<DropZone {...defaultProps} disabled />)
      const dropzone = container.querySelector('.sirv-dropzone')!

      expect(dropzone.getAttribute('tabIndex')).toBe('-1')
      expect(dropzone.getAttribute('aria-disabled')).toBe('true')
    })
  })
})
