import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SpreadsheetImport } from '../components/SpreadsheetImport'

describe('SpreadsheetImport Extended', () => {
  const defaultProps = {
    onUrls: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render drop zone', () => {
      render(<SpreadsheetImport {...defaultProps} />)
      expect(screen.getByText(/drop csv or excel file/i)).toBeInTheDocument()
    })

    it('should render hint text', () => {
      render(<SpreadsheetImport {...defaultProps} />)
      expect(screen.getByText(/file should contain a column with image urls/i)).toBeInTheDocument()
    })

    it('should render custom labels', () => {
      render(
        <SpreadsheetImport
          {...defaultProps}
          labels={{
            drop: 'Upload spreadsheet',
            hint: 'Must have URLs',
          }}
        />
      )
      expect(screen.getByText('Upload spreadsheet')).toBeInTheDocument()
      expect(screen.getByText('Must have URLs')).toBeInTheDocument()
    })

    it('should have file input accepting correct types', () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const input = container.querySelector('input[type="file"]')
      expect(input?.getAttribute('accept')).toBe('.csv,.xlsx,.xls,.txt')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <SpreadsheetImport {...defaultProps} className="custom-class" />
      )
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('should show active state on drag over', () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const dropZone = container.querySelector('.sirv-spreadsheet__drop')!

      fireEvent.dragOver(dropZone)
      expect(container.querySelector('.sirv-spreadsheet__drop--active')).toBeInTheDocument()
    })

    it('should remove active state on drag leave', () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const dropZone = container.querySelector('.sirv-spreadsheet__drop')!

      fireEvent.dragOver(dropZone)
      fireEvent.dragLeave(dropZone)
      expect(container.querySelector('.sirv-spreadsheet__drop--active')).not.toBeInTheDocument()
    })

    it('should show error for invalid file type', async () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const dropZone = container.querySelector('.sirv-spreadsheet__drop')!

      const file = new File([''], 'data.pdf', { type: 'application/pdf' })

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(screen.getByText(/please drop a csv or excel file/i)).toBeInTheDocument()
      })
    })
  })

  describe('File Selection', () => {
    it('should open file dialog on click', () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const dropZone = container.querySelector('.sirv-spreadsheet__drop')!
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = vi.spyOn(input, 'click')
      fireEvent.click(dropZone)
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should open file dialog on Enter key', () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const dropZone = container.querySelector('.sirv-spreadsheet__drop')!
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = vi.spyOn(input, 'click')
      fireEvent.keyDown(dropZone, { key: 'Enter' })
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should open file dialog on Space key', () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const dropZone = container.querySelector('.sirv-spreadsheet__drop')!
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = vi.spyOn(input, 'click')
      fireEvent.keyDown(dropZone, { key: ' ' })
      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper role and tabIndex', () => {
      const { container } = render(<SpreadsheetImport {...defaultProps} />)
      const dropZone = container.querySelector('.sirv-spreadsheet__drop')!

      expect(dropZone.getAttribute('role')).toBe('button')
      expect(dropZone.getAttribute('tabIndex')).toBe('0')
    })
  })
})
