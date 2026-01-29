import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageEditor } from '../components/ImageEditor'

describe('ImageEditor', () => {
  const mockFile = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
  const mockPreviewUrl = 'blob:test-preview'
  const defaultProps = {
    file: mockFile,
    previewUrl: mockPreviewUrl,
    onApply: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Image loading
    global.Image = class MockImage {
      onload: (() => void) | null = null
      src = ''
      width = 800
      height = 600

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
    } as unknown as typeof Image

    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
    }))

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(['test'], { type: 'image/jpeg' }))
    })

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,test')
  })

  it('should render with default labels', () => {
    render(<ImageEditor {...defaultProps} />)

    expect(screen.getByText('Edit Image')).toBeInTheDocument()
    expect(screen.getByText('Transform')).toBeInTheDocument()
    expect(screen.getByText('Crop')).toBeInTheDocument()
    expect(screen.getByText('Apply')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('should use custom labels', () => {
    render(
      <ImageEditor
        {...defaultProps}
        labels={{
          title: 'Photo Editor',
          apply: 'Save Changes',
          cancel: 'Discard',
        }}
      />
    )

    expect(screen.getByText('Photo Editor')).toBeInTheDocument()
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  it('should call onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ImageEditor {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalled()
  })

  it('should call onCancel when close button is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<ImageEditor {...defaultProps} onCancel={onCancel} />)

    const closeButton = container.querySelector('.sirv-editor__close')
    fireEvent.click(closeButton!)

    expect(onCancel).toHaveBeenCalled()
  })

  it('should call onCancel when clicking overlay', () => {
    const onCancel = vi.fn()
    const { container } = render(<ImageEditor {...defaultProps} onCancel={onCancel} />)

    const overlay = container.querySelector('.sirv-editor-overlay')
    fireEvent.click(overlay!)

    expect(onCancel).toHaveBeenCalled()
  })

  it('should not call onCancel when clicking inside editor', () => {
    const onCancel = vi.fn()
    const { container } = render(<ImageEditor {...defaultProps} onCancel={onCancel} />)

    const editor = container.querySelector('.sirv-editor')
    fireEvent.click(editor!)

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('should have Transform tab active by default', () => {
    const { container } = render(<ImageEditor {...defaultProps} />)

    const transformTab = container.querySelector('.sirv-editor__tab--active')
    expect(transformTab).toHaveTextContent('Transform')
  })

  it('should show transform controls in Transform mode', () => {
    const { container } = render(<ImageEditor {...defaultProps} />)

    expect(container.querySelector('.sirv-editor__transform-controls')).toBeInTheDocument()
  })

  it('should disable Apply button when no changes made', () => {
    render(<ImageEditor {...defaultProps} />)

    expect(screen.getByText('Apply')).toBeDisabled()
  })

  it('should disable Reset button when no changes made', () => {
    render(<ImageEditor {...defaultProps} />)

    expect(screen.getByText('Reset')).toBeDisabled()
  })

  it('should have rotate buttons with correct titles', () => {
    render(<ImageEditor {...defaultProps} />)

    expect(screen.getByTitle('Rotate Left')).toBeInTheDocument()
    expect(screen.getByTitle('Rotate Right')).toBeInTheDocument()
  })

  it('should have flip buttons with correct titles', () => {
    render(<ImageEditor {...defaultProps} />)

    expect(screen.getByTitle('Flip Horizontal')).toBeInTheDocument()
    expect(screen.getByTitle('Flip Vertical')).toBeInTheDocument()
  })

  it('should render canvas wrapper', () => {
    const { container } = render(<ImageEditor {...defaultProps} />)

    // Canvas is rendered inside canvas-wrapper or loading state is shown
    expect(
      container.querySelector('.sirv-editor__canvas-wrapper') ||
      container.querySelector('.sirv-editor__loading')
    ).toBeInTheDocument()
  })

  it('should render editor tabs', () => {
    const { container } = render(<ImageEditor {...defaultProps} />)

    const tabs = container.querySelectorAll('.sirv-editor__tab')
    expect(tabs).toHaveLength(2)
  })

  it('should render control buttons', () => {
    const { container } = render(<ImageEditor {...defaultProps} />)

    const controlButtons = container.querySelectorAll('.sirv-editor__control-btn')
    expect(controlButtons.length).toBeGreaterThan(0)
  })

  it('should have footer with action buttons', () => {
    const { container } = render(<ImageEditor {...defaultProps} />)

    expect(container.querySelector('.sirv-editor__footer')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Apply')).toBeInTheDocument()
  })

  it('should have header with title and close button', () => {
    const { container } = render(<ImageEditor {...defaultProps} />)

    expect(container.querySelector('.sirv-editor__header')).toBeInTheDocument()
    expect(container.querySelector('.sirv-editor__title')).toBeInTheDocument()
    expect(container.querySelector('.sirv-editor__close')).toBeInTheDocument()
  })
})
