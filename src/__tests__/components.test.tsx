import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DropZone } from '../components/DropZone'
import { FileList, FileListSummary } from '../components/FileList'
import type { SirvFile } from '../types'

describe('DropZone', () => {
  it('should render with default labels', () => {
    render(<DropZone onFiles={vi.fn()} />)
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
  })

  it('should render custom labels', () => {
    render(
      <DropZone
        onFiles={vi.fn()}
        labels={{ dropzone: 'Custom drop text' }}
      />
    )
    expect(screen.getByText('Custom drop text')).toBeInTheDocument()
  })

  it('should show hint text', () => {
    render(<DropZone onFiles={vi.fn()} />)
    expect(screen.getByText(/supports jpg, png/i)).toBeInTheDocument()
  })

  it('should hide hint in compact mode', () => {
    render(<DropZone onFiles={vi.fn()} compact />)
    expect(screen.queryByText(/supports jpg, png/i)).not.toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<DropZone onFiles={vi.fn()} disabled />)
    const dropzone = screen.getByRole('button')
    expect(dropzone).toHaveAttribute('aria-disabled', 'true')
  })

  it('should handle drag over', () => {
    render(<DropZone onFiles={vi.fn()} />)
    const dropzone = screen.getByRole('button')

    fireEvent.dragOver(dropzone)
    expect(dropzone).toHaveClass('sirv-dropzone--drag-over')
  })

  it('should handle drag leave', () => {
    render(<DropZone onFiles={vi.fn()} />)
    const dropzone = screen.getByRole('button')

    fireEvent.dragOver(dropzone)
    fireEvent.dragLeave(dropzone)
    expect(dropzone).not.toHaveClass('sirv-dropzone--drag-over')
  })

  it('should render children instead of default content', () => {
    render(
      <DropZone onFiles={vi.fn()}>
        <span>Custom content</span>
      </DropZone>
    )
    expect(screen.getByText('Custom content')).toBeInTheDocument()
    expect(screen.queryByText(/drop files here/i)).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<DropZone onFiles={vi.fn()} className="custom-class" />)
    const dropzone = screen.getByRole('button')
    expect(dropzone).toHaveClass('custom-class')
  })
})

describe('FileList', () => {
  const mockFiles: SirvFile[] = [
    {
      id: '1',
      filename: 'test1.jpg',
      previewUrl: 'blob:test1',
      status: 'pending',
      progress: 0,
      size: 1000,
    },
    {
      id: '2',
      filename: 'test2.jpg',
      previewUrl: 'blob:test2',
      status: 'uploading',
      progress: 50,
      size: 2000,
    },
    {
      id: '3',
      filename: 'test3.jpg',
      previewUrl: 'blob:test3',
      status: 'success',
      progress: 100,
      sirvUrl: 'https://example.sirv.com/test3.jpg',
    },
    {
      id: '4',
      filename: 'test4.jpg',
      previewUrl: '',
      status: 'error',
      progress: 0,
      error: 'Upload failed',
    },
  ]

  it('should render nothing when files array is empty', () => {
    const { container } = render(<FileList files={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render all files', () => {
    render(<FileList files={mockFiles} />)
    expect(screen.getByText('test1.jpg')).toBeInTheDocument()
    expect(screen.getByText('test2.jpg')).toBeInTheDocument()
    expect(screen.getByText('test3.jpg')).toBeInTheDocument()
    expect(screen.getByText('test4.jpg')).toBeInTheDocument()
  })

  it('should show error message for failed files', () => {
    render(<FileList files={mockFiles} />)
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })

  it('should show file size', () => {
    render(<FileList files={mockFiles} />)
    expect(screen.getByText('1000 B')).toBeInTheDocument()
  })

  it('should call onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(<FileList files={mockFiles} onRemove={onRemove} />)

    const removeButtons = screen.getAllByLabelText(/remove/i)
    fireEvent.click(removeButtons[0])

    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<FileList files={mockFiles} onRetry={onRetry} />)

    const retryButton = screen.getByLabelText(/retry/i)
    fireEvent.click(retryButton)

    expect(onRetry).toHaveBeenCalledWith('4')
  })

  it('should show uploading status', () => {
    render(<FileList files={mockFiles} />)
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
  })

  it('should show uploaded status', () => {
    render(<FileList files={mockFiles} />)
    expect(screen.getByText('Uploaded')).toBeInTheDocument()
  })
})

describe('FileListSummary', () => {
  it('should render nothing when files array is empty', () => {
    const { container } = render(<FileListSummary files={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should show total count', () => {
    const files: SirvFile[] = [
      { id: '1', filename: 'test.jpg', previewUrl: '', status: 'success', progress: 100 },
    ]
    render(<FileListSummary files={files} />)
    expect(screen.getByText('1 files')).toBeInTheDocument()
  })

  it('should show success count', () => {
    const files: SirvFile[] = [
      { id: '1', filename: 'test.jpg', previewUrl: '', status: 'success', progress: 100 },
      { id: '2', filename: 'test2.jpg', previewUrl: '', status: 'success', progress: 100 },
    ]
    render(<FileListSummary files={files} />)
    expect(screen.getByText('2 uploaded')).toBeInTheDocument()
  })

  it('should show error count', () => {
    const files: SirvFile[] = [
      { id: '1', filename: 'test.jpg', previewUrl: '', status: 'error', progress: 0, error: 'Failed' },
    ]
    render(<FileListSummary files={files} />)
    expect(screen.getByText('1 failed')).toBeInTheDocument()
  })

  it('should show pending count', () => {
    const files: SirvFile[] = [
      { id: '1', filename: 'test.jpg', previewUrl: '', status: 'pending', progress: 0 },
    ]
    render(<FileListSummary files={files} />)
    expect(screen.getByText('1 pending')).toBeInTheDocument()
  })

  it('should show uploading count', () => {
    const files: SirvFile[] = [
      { id: '1', filename: 'test.jpg', previewUrl: '', status: 'uploading', progress: 50 },
    ]
    render(<FileListSummary files={files} />)
    expect(screen.getByText('1 uploading')).toBeInTheDocument()
  })
})
