import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpreadsheetImport } from '../components/SpreadsheetImport'

describe('SpreadsheetImport', () => {
  const mockOnUrls = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render drop zone', () => {
    render(<SpreadsheetImport onUrls={mockOnUrls} />)

    expect(screen.getByText(/drop csv or excel file/i)).toBeInTheDocument()
  })

  it('should render hint text', () => {
    render(<SpreadsheetImport onUrls={mockOnUrls} />)

    expect(screen.getByText(/file should contain a column with image urls/i)).toBeInTheDocument()
  })

  it('should use custom labels', () => {
    render(
      <SpreadsheetImport
        onUrls={mockOnUrls}
        labels={{
          drop: 'Upload your spreadsheet',
          hint: 'Must have URL column',
        }}
      />
    )

    expect(screen.getByText('Upload your spreadsheet')).toBeInTheDocument()
    expect(screen.getByText('Must have URL column')).toBeInTheDocument()
  })

  it('should have hidden file input', () => {
    render(<SpreadsheetImport onUrls={mockOnUrls} />)

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveStyle({ display: 'none' })
  })

  it('should accept CSV and Excel files', () => {
    render(<SpreadsheetImport onUrls={mockOnUrls} />)

    const fileInput = document.querySelector('input[type="file"]')
    const accept = fileInput?.getAttribute('accept')
    expect(accept).toContain('.csv')
    expect(accept).toContain('.xlsx')
    expect(accept).toContain('.xls')
    expect(accept).toContain('.txt')
  })

  it('should have clickable drop zone', () => {
    render(<SpreadsheetImport onUrls={mockOnUrls} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <SpreadsheetImport onUrls={mockOnUrls} className="custom-import" />
    )

    expect(container.querySelector('.custom-import')).toBeInTheDocument()
  })

  it('should highlight on drag over', () => {
    const { container } = render(<SpreadsheetImport onUrls={mockOnUrls} />)

    const dropZone = container.querySelector('.sirv-spreadsheet__drop')!
    fireEvent.dragOver(dropZone)

    expect(dropZone).toHaveClass('sirv-spreadsheet__drop--active')
  })

  it('should remove highlight on drag leave', () => {
    const { container } = render(<SpreadsheetImport onUrls={mockOnUrls} />)

    const dropZone = container.querySelector('.sirv-spreadsheet__drop')!
    fireEvent.dragOver(dropZone)
    fireEvent.dragLeave(dropZone)

    expect(dropZone).not.toHaveClass('sirv-spreadsheet__drop--active')
  })

  it('should show error for non-spreadsheet file drop', async () => {
    render(<SpreadsheetImport onUrls={mockOnUrls} />)

    const dropZone = screen.getByRole('button')
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })

    // Should show error message
    expect(await screen.findByText(/please drop a csv or excel file/i)).toBeInTheDocument()
  })

  it('should render spreadsheet icon', () => {
    const { container } = render(<SpreadsheetImport onUrls={mockOnUrls} />)

    expect(container.querySelector('svg.sirv-spreadsheet__icon')).toBeInTheDocument()
  })

  it('should be keyboard accessible', () => {
    render(<SpreadsheetImport onUrls={mockOnUrls} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('tabIndex', '0')
  })
})
