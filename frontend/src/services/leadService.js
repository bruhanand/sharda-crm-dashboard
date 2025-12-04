/**
 * Lead Service - API service layer for lead operations
 * Centralizes all lead-related API calls for better organization and testing
 */
import { apiRequest } from '../lib/api'

export const leadService = {
    /**
     * Get all leads with optional filtering
     * @param {Object} params - Query parameters for filtering
     * @returns {Promise<Object>} Paginated leads response
     */
    getLeads: async (params = {}) => {
        return apiRequest('leads/', { params })
    },

    /**
     * Get a single lead by ID
     * @param {number} leadId - Lead ID
     * @returns {Promise<Object>} Lead object
     */
    getLead: async (leadId) => {
        return apiRequest(`leads/${leadId}/`)
    },

    /**
     * Update a lead
     * @param {number} leadId - Lead ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated lead
     */
    updateLead: async (leadId, updates) => {
        return apiRequest(`leads/${leadId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        })
    },

    /**
     * Bulk update multiple leads
     * @param {Object} updates - Map of leadId to update data
     * @returns {Promise<void>}
     */
    bulkUpdateLeads: async (updates) => {
        const promises = Object.entries(updates).map(([leadId, data]) =>
            leadService.updateLead(leadId, data)
        )
        return Promise.all(promises)
    },

    /**
     * Upload file for preview
     * @param {File} file - File to upload
     * @returns {Promise<Object>} Preview data
     */
    uploadPreview: async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        return apiRequest('leads/upload/preview/', {
            method: 'POST',
            body: formData,
        })
    },

    /**
     * Create leads from uploaded data
     * @param {Array} rows - Lead data rows
     * @returns {Promise<Object>} Creation result
     */
    uploadCreate: async (rows) => {
        return apiRequest('leads/upload/create/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows }),
        })
    },

    /**
     * Get KPI data
     * @param {Object} params - Filter parameters
     * @returns {Promise<Object>} KPI metrics
     */
    getKPIs: async (params = {}) => {
        return apiRequest('kpi/', { params })
    },

    /**
     * Get charts data
     * @param {Object} params - Filter parameters
     * @returns {Promise<Object>} Chart data
     */
    getCharts: async (params = {}) => {
        return apiRequest('charts/', { params })
    },

    /**
     * Get forecast data
     * @param {Object} params - Filter parameters
     * @returns {Promise<Object>} Forecast data
     */
    getForecast: async (params = {}) => {
        return apiRequest('forecast/', { params })
    },

    /**
     * Get insights data
     * @param {Object} params - Filter parameters
     * @returns {Promise<Object>} Insights data
     */
    getInsights: async (params = {}) => {
        return apiRequest('insights/', { params })
    },
}
