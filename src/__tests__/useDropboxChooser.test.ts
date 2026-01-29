import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDropboxChooser } from '../hooks/useDropboxChooser'

describe('useDropboxChooser', () => {
  beforeEach(() => {
    // Clean up any existing Dropbox SDK
    delete (window as Window & { Dropbox?: unknown }).Dropbox
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as Window & { Dropbox?: unknown }).Dropbox
  })

  it('should not be configured when appKey is empty', () => {
    const { result } = renderHook(() =>
      useDropboxChooser({
        appKey: '',
        onSelect: vi.fn(),
      })
    )

    expect(result.current.isConfigured).toBe(false)
  })

  it('should be configured when appKey is provided', () => {
    const { result } = renderHook(() =>
      useDropboxChooser({
        appKey: 'test-app-key',
        onSelect: vi.fn(),
      })
    )

    expect(result.current.isConfigured).toBe(true)
  })

  it('should initialize with isLoading false', () => {
    const { result } = renderHook(() =>
      useDropboxChooser({
        appKey: 'test-app-key',
        onSelect: vi.fn(),
      })
    )

    expect(result.current.isLoading).toBe(false)
  })

  it('should provide openChooser function', () => {
    const { result } = renderHook(() =>
      useDropboxChooser({
        appKey: 'test-app-key',
        onSelect: vi.fn(),
      })
    )

    expect(typeof result.current.openChooser).toBe('function')
  })

  it('should not open chooser when not configured', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() =>
      useDropboxChooser({
        appKey: '',
        onSelect: vi.fn(),
      })
    )

    act(() => {
      result.current.openChooser()
    })

    // Should not crash, isLoading should remain false
    expect(result.current.isLoading).toBe(false)
    consoleSpy.mockRestore()
  })

  it('should log warning when Dropbox SDK not available', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() =>
      useDropboxChooser({
        appKey: 'test-app-key',
        onSelect: vi.fn(),
      })
    )

    act(() => {
      result.current.openChooser()
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should be ready to use with valid app key', () => {
    const { result } = renderHook(() =>
      useDropboxChooser({
        appKey: 'test-app-key',
        onSelect: vi.fn(),
      })
    )

    expect(result.current.isConfigured).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(typeof result.current.openChooser).toBe('function')
  })
})
