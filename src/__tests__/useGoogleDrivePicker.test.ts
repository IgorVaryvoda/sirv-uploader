import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGoogleDrivePicker } from '../hooks/useGoogleDrivePicker'

describe('useGoogleDrivePicker', () => {
  beforeEach(() => {
    // Clean up Google API
    delete (window as Window & { gapi?: unknown; google?: unknown }).gapi
    delete (window as Window & { gapi?: unknown; google?: unknown }).google
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as Window & { gapi?: unknown; google?: unknown }).gapi
    delete (window as Window & { gapi?: unknown; google?: unknown }).google
  })

  it('should not be configured when credentials are missing', () => {
    const { result } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: '',
        apiKey: '',
        appId: '',
        onSelect: vi.fn(),
      })
    )

    expect(result.current.isConfigured).toBe(false)
  })

  it('should be configured when all credentials are provided', () => {
    const { result } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
        appId: 'test-app-id',
        onSelect: vi.fn(),
      })
    )

    expect(result.current.isConfigured).toBe(true)
  })

  it('should initialize with isLoading false', () => {
    const { result } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
        appId: 'test-app-id',
        onSelect: vi.fn(),
      })
    )

    expect(result.current.isLoading).toBe(false)
  })

  it('should provide openPicker function', () => {
    const { result } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
        appId: 'test-app-id',
        onSelect: vi.fn(),
      })
    )

    expect(typeof result.current.openPicker).toBe('function')
  })

  it('should not open picker when not configured', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onSelect = vi.fn()
    const { result } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: '',
        apiKey: '',
        appId: '',
        onSelect,
      })
    )

    await act(async () => {
      result.current.openPicker()
    })

    expect(onSelect).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should not be configured with partial credentials', () => {
    const { result: result1 } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: 'test-client-id',
        apiKey: '', // missing
        appId: 'test-app-id',
        onSelect: vi.fn(),
      })
    )
    expect(result1.current.isConfigured).toBe(false)

    const { result: result2 } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: '',
        apiKey: 'test-api-key',
        appId: 'test-app-id',
        onSelect: vi.fn(),
      })
    )
    expect(result2.current.isConfigured).toBe(false)

    const { result: result3 } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
        appId: '', // missing
        onSelect: vi.fn(),
      })
    )
    expect(result3.current.isConfigured).toBe(false)
  })

  it('should handle missing Google SDK gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() =>
      useGoogleDrivePicker({
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
        appId: 'test-app-id',
        onSelect: vi.fn(),
      })
    )

    await act(async () => {
      result.current.openPicker()
      // Wait for any async operations
      await new Promise(r => setTimeout(r, 50))
    })

    // Should not crash - isLoading may be true or false depending on timing
    expect(result.current.isConfigured).toBe(true)

    consoleSpy.mockRestore()
  })
})
