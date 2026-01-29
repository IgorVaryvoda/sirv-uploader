import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StagedFilesGrid } from '../components/StagedFilesGrid'
import type { SirvFile } from '../types'

describe('StagedFilesGrid', () => {
  const createMockFile = (overrides: Partial<SirvFile> = {}): SirvFile => ({
    id: '1',
    filename: 'test.jpg',
    previewUrl: 'blob:test',
    status: 'pending',
    progress: 0,
    size: 1000,
    file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    ...overrides,
  })

  const mockFiles: SirvFile[] = [
    createMockFile({ id: '1', filename: 'image1.jpg' }),
    createMockFile({ id: '2', filename: 'image2.jpg', previewUrl: 'blob:test2' }),
    createMockFile({ id: '3', filename: 'image3.jpg', previewUrl: 'blob:test3' }),
  ]

  it('should render all files', () => {
    render(<StagedFilesGrid files={mockFiles} onRemove={vi.fn()} />)

    expect(screen.getByText('image1.jpg')).toBeInTheDocument()
    expect(screen.getByText('image2.jpg')).toBeInTheDocument()
    expect(screen.getByText('image3.jpg')).toBeInTheDocument()
  })

  it('should render file sizes', () => {
    render(<StagedFilesGrid files={mockFiles} onRemove={vi.fn()} />)

    // All files have 1000 bytes = "1000 B"
    const sizes = screen.getAllByText('1000 B')
    expect(sizes).toHaveLength(3)
  })

  it('should hide filenames when showFilenames is false', () => {
    render(<StagedFilesGrid files={mockFiles} onRemove={vi.fn()} showFilenames={false} />)

    expect(screen.queryByText('image1.jpg')).not.toBeInTheDocument()
  })

  it('should call onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(<StagedFilesGrid files={mockFiles} onRemove={onRemove} />)

    const removeButtons = screen.getAllByTitle('Remove')
    fireEvent.click(removeButtons[0])

    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('should show Add more button when onAddMore is provided', () => {
    render(
      <StagedFilesGrid
        files={mockFiles}
        onRemove={vi.fn()}
        onAddMore={vi.fn()}
      />
    )

    expect(screen.getByText('Add more')).toBeInTheDocument()
  })

  it('should hide Add more button when at maxFiles', () => {
    render(
      <StagedFilesGrid
        files={mockFiles}
        onRemove={vi.fn()}
        onAddMore={vi.fn()}
        maxFiles={3}
      />
    )

    expect(screen.queryByText('Add more')).not.toBeInTheDocument()
  })

  it('should use custom labels', () => {
    render(
      <StagedFilesGrid
        files={mockFiles}
        onRemove={vi.fn()}
        onAddMore={vi.fn()}
        labels={{
          addMore: 'Upload More',
          remove: 'Delete',
          edit: 'Modify',
        }}
      />
    )

    expect(screen.getByText('Upload More')).toBeInTheDocument()
    expect(screen.getAllByTitle('Delete')).toHaveLength(3)
  })

  it('should apply custom className', () => {
    const { container } = render(
      <StagedFilesGrid
        files={mockFiles}
        onRemove={vi.fn()}
        className="custom-grid"
      />
    )

    expect(container.querySelector('.custom-grid')).toBeInTheDocument()
  })

  it('should show error state for files with errors', () => {
    const errorFile = createMockFile({
      id: '1',
      filename: 'error.jpg',
      status: 'error',
      error: 'Upload failed',
    })

    render(<StagedFilesGrid files={[errorFile]} onRemove={vi.fn()} />)

    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })

  it('should show success state for uploaded files', () => {
    const successFile = createMockFile({
      id: '1',
      filename: 'success.jpg',
      status: 'success',
      progress: 100,
    })

    const { container } = render(<StagedFilesGrid files={[successFile]} onRemove={vi.fn()} />)

    expect(container.querySelector('.sirv-staged-grid__item--success')).toBeInTheDocument()
  })

  it('should show uploading state with progress bar', () => {
    const uploadingFile = createMockFile({
      id: '1',
      filename: 'uploading.jpg',
      status: 'uploading',
      progress: 50,
    })

    const { container } = render(<StagedFilesGrid files={[uploadingFile]} onRemove={vi.fn()} />)

    expect(container.querySelector('.sirv-staged-grid__progress')).toBeInTheDocument()
    expect(container.querySelector('.sirv-staged-grid__progress-bar')).toHaveStyle({ width: '50%' })
  })

  it('should hide overlay buttons when disabled', () => {
    render(<StagedFilesGrid files={mockFiles} onRemove={vi.fn()} disabled />)

    expect(screen.queryAllByTitle('Remove')).toHaveLength(0)
  })

  it('should show edit button when enableEditor is true and file has preview', () => {
    render(
      <StagedFilesGrid
        files={mockFiles}
        onRemove={vi.fn()}
        enableEditor
      />
    )

    expect(screen.getAllByTitle('Edit')).toHaveLength(3)
  })

  it('should not show edit button for files without preview', () => {
    const noPreviewFile = createMockFile({
      id: '1',
      filename: 'no-preview.pdf',
      previewUrl: '',
    })

    render(
      <StagedFilesGrid
        files={[noPreviewFile]}
        onRemove={vi.fn()}
        enableEditor
      />
    )

    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument()
  })

  // File type placeholder icons
  describe('file type placeholders', () => {
    it('should show video icon for video files', () => {
      const videoFile = createMockFile({
        id: '1',
        filename: 'video.mp4',
        previewUrl: '',
        fileCategory: 'video',
      })

      const { container } = render(<StagedFilesGrid files={[videoFile]} onRemove={vi.fn()} />)

      expect(container.querySelector('.sirv-staged-grid__placeholder')).toBeInTheDocument()
    })

    it('should show 3D icon for 3D files', () => {
      const model3dFile = createMockFile({
        id: '1',
        filename: 'model.glb',
        previewUrl: '',
        fileCategory: '3d',
      })

      const { container } = render(<StagedFilesGrid files={[model3dFile]} onRemove={vi.fn()} />)

      expect(container.querySelector('.sirv-staged-grid__placeholder')).toBeInTheDocument()
    })

    it('should show PDF icon for PDF files', () => {
      const pdfFile = createMockFile({
        id: '1',
        filename: 'document.pdf',
        previewUrl: '',
        fileCategory: 'pdf',
      })

      const { container } = render(<StagedFilesGrid files={[pdfFile]} onRemove={vi.fn()} />)

      expect(container.querySelector('.sirv-staged-grid__placeholder')).toBeInTheDocument()
    })

    it('should show spreadsheet icon for Excel files', () => {
      const excelFile = createMockFile({
        id: '1',
        filename: 'data.xlsx',
        previewUrl: '',
        fileCategory: 'document',
      })

      const { container } = render(<StagedFilesGrid files={[excelFile]} onRemove={vi.fn()} />)

      expect(container.querySelector('.sirv-staged-grid__placeholder')).toBeInTheDocument()
    })
  })

  // Image preview
  it('should render image preview when previewUrl exists', () => {
    render(<StagedFilesGrid files={mockFiles} onRemove={vi.fn()} />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute('src', 'blob:test')
  })
})
