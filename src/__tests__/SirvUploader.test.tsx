import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SirvUploader } from '../components/SirvUploader'

describe('SirvUploader', () => {
  const defaultProps = {
    proxyEndpoint: '/api/sirv',
    folder: '/uploads',
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<SirvUploader {...defaultProps} />)
      expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
    })

    it('should render Upload Files tab by default', () => {
      render(<SirvUploader {...defaultProps} />)
      expect(screen.getByText('Upload Files')).toBeInTheDocument()
    })

    it('should render Import URLs tab when csvImport is enabled', () => {
      render(<SirvUploader {...defaultProps} features={{ csvImport: true }} />)
      expect(screen.getByText('Import URLs')).toBeInTheDocument()
    })

    it('should hide Import URLs tab when csvImport is disabled', () => {
      render(<SirvUploader {...defaultProps} features={{ csvImport: false }} />)
      expect(screen.queryByText('Import URLs')).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <SirvUploader {...defaultProps} className="custom-uploader" />
      )
      expect(container.querySelector('.custom-uploader')).toBeInTheDocument()
    })

    it('should apply dark theme class', () => {
      const { container } = render(
        <SirvUploader {...defaultProps} theme="dark" />
      )
      expect(container.querySelector('.sirv-uploader--dark')).toBeInTheDocument()
    })

    it('should apply light theme class', () => {
      const { container } = render(
        <SirvUploader {...defaultProps} theme="light" />
      )
      expect(container.querySelector('.sirv-uploader--light')).toBeInTheDocument()
    })

    it('should not apply theme class when auto', () => {
      const { container } = render(
        <SirvUploader {...defaultProps} theme="auto" />
      )
      expect(container.querySelector('.sirv-uploader--dark')).not.toBeInTheDocument()
      expect(container.querySelector('.sirv-uploader--light')).not.toBeInTheDocument()
    })

    it('should render children in DropZone', () => {
      render(
        <SirvUploader {...defaultProps}>
          <span>Custom drop zone content</span>
        </SirvUploader>
      )
      expect(screen.getByText('Custom drop zone content')).toBeInTheDocument()
    })
  })

  describe('Labels', () => {
    it('should use custom labels', () => {
      render(
        <SirvUploader
          {...defaultProps}
          labels={{
            dropzone: 'Drop your images here',
            uploadFiles: 'Upload',
            importUrls: 'From URLs',
          }}
          features={{ csvImport: true }}
        />
      )

      expect(screen.getByText('Drop your images here')).toBeInTheDocument()
      expect(screen.getByText('Upload')).toBeInTheDocument()
      expect(screen.getByText('From URLs')).toBeInTheDocument()
    })
  })

  describe('Tabs', () => {
    it('should switch tabs when clicked', () => {
      render(<SirvUploader {...defaultProps} features={{ csvImport: true }} />)

      // Click Import URLs tab
      fireEvent.click(screen.getByText('Import URLs'))

      // Click back to Upload Files tab
      fireEvent.click(screen.getByText('Upload Files'))

      expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
    })

    it('should show Dropbox tab when configured', () => {
      render(
        <SirvUploader
          {...defaultProps}
          dropbox={{ appKey: 'test-app-key' }}
        />
      )

      expect(screen.getByText('Dropbox')).toBeInTheDocument()
    })

    it('should show Google Drive tab when configured', () => {
      render(
        <SirvUploader
          {...defaultProps}
          googleDrive={{
            clientId: 'test-client-id',
            apiKey: 'test-api-key',
            appId: 'test-app-id',
          }}
        />
      )

      expect(screen.getByText('Google Drive')).toBeInTheDocument()
    })
  })

  describe('Features', () => {
    it('should disable drag and drop when dragDrop is false', () => {
      render(
        <SirvUploader {...defaultProps} features={{ dragDrop: false }} />
      )

      expect(screen.queryByText(/drop files here/i)).not.toBeInTheDocument()
    })

    it('should enable batch uploads by default', () => {
      render(<SirvUploader {...defaultProps} />)

      const input = document.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('multiple')
    })

    it('should disable batch when batch is false', () => {
      render(
        <SirvUploader {...defaultProps} features={{ batch: false }} />
      )

      const input = document.querySelector('input[type="file"]')
      expect(input).not.toHaveAttribute('multiple')
    })
  })

  describe('Props', () => {
    it('should use compact mode', () => {
      render(<SirvUploader {...defaultProps} compact />)

      // Compact mode hides the hint text
      expect(screen.queryByText(/supports jpg/i)).not.toBeInTheDocument()
    })

    it('should use custom accept formats', () => {
      render(
        <SirvUploader {...defaultProps} accept={['image/png', 'image/jpeg']} />
      )

      const input = document.querySelector('input[type="file"]')
      expect(input?.getAttribute('accept')).toBe('image/png,image/jpeg')
    })
  })

  describe('Callbacks', () => {
    it('should warn when no endpoint is configured', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // @ts-expect-error - testing missing required prop
      render(<SirvUploader folder="/uploads" />)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('proxyEndpoint is required')
      )

      consoleSpy.mockRestore()
    })
  })
})
