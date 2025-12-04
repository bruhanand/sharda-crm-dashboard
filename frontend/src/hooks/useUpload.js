/**
 * Custom React hook for managing upload functionality
 * Extracted from App.jsx to improve code organization
 */
import { useState } from 'react'
import { apiRequest } from '../lib/api'

/**
 * Hook for managing file upload state and operations
 * @returns {Object} Upload state and handlers
 */
export const useUpload = () => {
    const [uploadFile, setUploadFile] = useState(null)
    const [uploadPreview, setUploadPreview] = useState(null)
    const [selectedNewRows, setSelectedNewRows] = useState({})
    const [uploadMessage, setUploadMessage] = useState(null)

    /**
     * Preview uploaded file and get reconciliation data
     */
    const handleUploadPreview = async () => {
        if (!uploadFile) {
            setUploadMessage('Please select a CSV or Excel file.')
            return
        }

        const formData = new FormData()
        formData.append('file', uploadFile)
        setUploadMessage('Uploading and reconciling leads…')

        try {
            const response = await apiRequest('leads/upload/preview/', {
                method: 'POST',
                body: formData,
            })

            const enriched = {
                ...response,
                new_candidates: (response.new_candidates || []).map((candidate, index) => ({
                    ...candidate,
                    _rowKey:
                        candidate.enquiry_id ||
                        candidate.raw?.['Enquiry No'] ||
                        candidate.raw?.EnquiryID ||
                        `row-${index}`,
                })),
            }

            setUploadPreview(enriched)

            const defaultSelection = {}
            enriched.new_candidates.forEach((candidate) => {
                if (candidate._rowKey) {
                    defaultSelection[candidate._rowKey] = true
                }
            })

            setSelectedNewRows(defaultSelection)
            setUploadMessage(`Updated ${response.updated_count} existing leads. Review new entries below.`)
        } catch (error) {
            setUploadMessage(error.message || 'Unable to preview upload.')
        }
    }

    /**
     * Reset upload state
     */
    const resetUpload = () => {
        setUploadFile(null)
        setUploadPreview(null)
        setSelectedNewRows({})
        setUploadMessage(null)
    }

    return {
        uploadFile,
        setUploadFile,
        uploadPreview,
        setUploadPreview,
        selectedNewRows,
        setSelectedNewRows,
        uploadMessage,
        setUploadMessage,
        handleUploadPreview,
        resetUpload,
    }
}
