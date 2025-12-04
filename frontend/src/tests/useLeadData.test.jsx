import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLeadData } from '../hooks/useLeadData'

// Mock the API
vi.mock('../lib/api', () => ({
    apiRequest: vi.fn(),
}))

import { apiRequest } from '../lib/api'

describe('useLeadData Hook', () => {
    const mockFilters = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: '',
        dealer: '',
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches leads data on mount', async () => {
        const mockLeads = [
            { id: 1, enquiry_id: 'TEST001', dealer: 'Dealer 1' },
            { id: 2, enquiry_id: 'TEST002', dealer: 'Dealer 2' },
        ]

        apiRequest.mockResolvedValueOnce({ results: mockLeads })

        const { result } = renderHook(() =>
            useLeadData(mockFilters, 0, true)
        )

        expect(result.current.isLoading).toBe(true)

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.leads).toEqual(mockLeads)
        expect(result.current.apiError).toBeNull()
    })

    it('handles API errors gracefully', async () => {
        apiRequest.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() =>
            useLeadData(mockFilters, 0, true)
        )

        await waitFor(() => {
            expect(result.current.apiError).toBe('Network error')
        })

        expect(result.current.leads).toEqual([])
        expect(result.current.isLoading).toBe(false)
    })

    it('does not fetch when not authenticated', () => {
        renderHook(() => useLeadData(mockFilters, 0, false))

        expect(apiRequest).not.toHaveBeenCalled()
    })

    it('refetches data when refreshKey changes', async () => {
        apiRequest.mockResolvedValue({ results: [] })

        const { rerender } = renderHook(
            ({ refreshKey }) => useLeadData(mockFilters, refreshKey, true),
            { initialProps: { refreshKey: 0 } }
        )

        await waitFor(() => {
            expect(apiRequest).toHaveBeenCalledTimes(1)
        })

        rerender({ refreshKey: 1 })

        await waitFor(() => {
            expect(apiRequest).toHaveBeenCalledTimes(2)
        })
    })
})
