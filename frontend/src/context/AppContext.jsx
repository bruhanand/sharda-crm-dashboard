/**
 * React Context for global application state
 * Replaces prop drilling and improves state management
 */
import { createContext, useContext } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useFilters } from '../hooks/useFilters'
import { useUpload } from '../hooks/useUpload'
import { useLeadData } from '../hooks/useLeadData'

const AppContext = createContext(null)

/**
 * AppContext Provider Component
 * Manages all global application state
 */
export const AppProvider = ({ children }) => {
    const auth = useAuth()
    const filtersState = useFilters()
    const uploadState = useUpload()

    // Lead data depends on auth and filters
    const { leads, setLeads, kpiData, forecastSummary, insightData, isLoading, apiError } = useLeadData(
        filtersState.filters,
        0, // refreshKey managed separately
        auth.isAuthenticated
    )

    const value = {
        // Authentication
        auth,

        // Filters
        filters: filtersState,

        // Upload
        upload: uploadState,

        // Lead Data
        leads,
        setLeads,
        kpiData,
        forecastSummary,
        insightData,
        isLoading,
        apiError,
    }

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * Custom hook to use AppContext
 * @throws {Error} if used outside AppProvider
 * @returns {Object} Application context value
 */
export const useApp = () => {
    const context = useContext(AppContext)
    if (!context) {
        throw new Error('useApp must be used within AppProvider')
    }
    return context
}
