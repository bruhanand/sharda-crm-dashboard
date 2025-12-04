/**
 * Custom React hook for managing filter state
 * Extracted from App.jsx to improve code organization
 */
import { useState } from 'react'
import { initialFilters } from '../utils/filterUtils'

/**
 * Hook for managing filter state and date drafts
 * @returns {Object} Filter state and handlers
 */
export const useFilters = () => {
    const [filters, setFilters] = useState(initialFilters)
    const [dateDraft, setDateDraft] = useState({
        start: initialFilters.startDate,
        end: initialFilters.endDate,
    })

    /**
     * Clear all filters to initial state
     */
    const clearFilters = () => {
        setFilters(initialFilters)
        setDateDraft({
            start: initialFilters.startDate,
            end: initialFilters.endDate,
        })
    }

    /**
     * Apply date filters from draft state
     */
    const applyDateFilters = () => {
        setFilters((prev) => ({
            ...prev,
            startDate: dateDraft.start,
            endDate: dateDraft.end,
        }))
    }

    /**
     * Update specific filter field
     * @param {string} field - Filter field name
     * @param {any} value - New value
     */
    const updateFilter = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    return {
        filters,
        setFilters,
        dateDraft,
        setDateDraft,
        clearFilters,
        applyDateFilters,
        updateFilter,
    }
}
