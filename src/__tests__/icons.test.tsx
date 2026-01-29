import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  UploadIcon,
  UrlIcon,
  DropboxIcon,
  GoogleDriveIcon,
  RotateLeftIcon,
  RotateRightIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  CropIcon,
  TransformIcon,
  CloseIcon,
  SpinnerIcon,
  VideoIcon,
  Model3DIcon,
  PdfIcon,
  SpreadsheetIcon,
  PresentationIcon,
  DocumentIcon,
  FileIcon,
  EditIcon,
  RemoveIcon,
  PlusIcon,
  CheckIcon,
} from '../components/icons'

describe('Icons', () => {
  describe('Tab Icons', () => {
    it('should render UploadIcon', () => {
      const { container } = render(<UploadIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-uploader__tab-icon')).toBeInTheDocument()
    })

    it('should render UrlIcon', () => {
      const { container } = render(<UrlIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-uploader__tab-icon')).toBeInTheDocument()
    })

    it('should render DropboxIcon', () => {
      const { container } = render(<DropboxIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-uploader__tab-icon')).toBeInTheDocument()
    })

    it('should render GoogleDriveIcon', () => {
      const { container } = render(<GoogleDriveIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-uploader__tab-icon')).toBeInTheDocument()
    })
  })

  describe('Editor Icons', () => {
    it('should render RotateLeftIcon', () => {
      const { container } = render(<RotateLeftIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__icon')).toBeInTheDocument()
    })

    it('should render RotateRightIcon', () => {
      const { container } = render(<RotateRightIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__icon')).toBeInTheDocument()
    })

    it('should render FlipHorizontalIcon', () => {
      const { container } = render(<FlipHorizontalIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__icon')).toBeInTheDocument()
    })

    it('should render FlipVerticalIcon', () => {
      const { container } = render(<FlipVerticalIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__icon')).toBeInTheDocument()
    })

    it('should render CropIcon', () => {
      const { container } = render(<CropIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__icon')).toBeInTheDocument()
    })

    it('should render TransformIcon', () => {
      const { container } = render(<TransformIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__icon')).toBeInTheDocument()
    })

    it('should render CloseIcon', () => {
      const { container } = render(<CloseIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__icon')).toBeInTheDocument()
    })

    it('should render SpinnerIcon with animation class', () => {
      const { container } = render(<SpinnerIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-editor__spinner')).toBeInTheDocument()
    })
  })

  describe('File Type Placeholder Icons', () => {
    it('should render VideoIcon', () => {
      const { container } = render(<VideoIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__placeholder-icon')).toBeInTheDocument()
    })

    it('should render Model3DIcon', () => {
      const { container } = render(<Model3DIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__placeholder-icon')).toBeInTheDocument()
    })

    it('should render PdfIcon', () => {
      const { container } = render(<PdfIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__placeholder-icon')).toBeInTheDocument()
    })

    it('should render SpreadsheetIcon', () => {
      const { container } = render(<SpreadsheetIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__placeholder-icon')).toBeInTheDocument()
    })

    it('should render PresentationIcon', () => {
      const { container } = render(<PresentationIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__placeholder-icon')).toBeInTheDocument()
    })

    it('should render DocumentIcon', () => {
      const { container } = render(<DocumentIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__placeholder-icon')).toBeInTheDocument()
    })

    it('should render FileIcon', () => {
      const { container } = render(<FileIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__placeholder-icon')).toBeInTheDocument()
    })
  })

  describe('Action Icons', () => {
    it('should render EditIcon', () => {
      const { container } = render(<EditIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__action-icon')).toBeInTheDocument()
    })

    it('should render RemoveIcon', () => {
      const { container } = render(<RemoveIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__action-icon')).toBeInTheDocument()
    })

    it('should render PlusIcon', () => {
      const { container } = render(<PlusIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('.sirv-staged-grid__add-icon')).toBeInTheDocument()
    })

    it('should render CheckIcon', () => {
      const { container } = render(<CheckIcon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('SVG Structure', () => {
    it('icons should have correct viewBox', () => {
      const { container } = render(<UploadIcon />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('stroke icons should have stroke attributes', () => {
      const { container } = render(<UploadIcon />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('stroke', 'currentColor')
    })

    it('fill icons should have fill attribute', () => {
      const { container } = render(<DropboxIcon />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('fill', 'currentColor')
    })
  })

  describe('Icon Memoization', () => {
    it('icons should be stable between renders', () => {
      const { container, rerender } = render(<UploadIcon />)
      const firstRender = container.innerHTML

      rerender(<UploadIcon />)
      const secondRender = container.innerHTML

      expect(firstRender).toBe(secondRender)
    })
  })
})
