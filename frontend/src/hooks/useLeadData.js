import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { fallbackLeads } from '../data/mockLeads'
import {
    buildKpisFromDataset,
    buildForecastFromDataset,
    buildInsightsFromDataset,
    formatKpisResponse,
    formatForecastResponse,
} from '../lib/analytics'
import { buildQueryParams } from '../utils/filterUtils'

/**
 * Custom hook for managing lead data fetching and state
 */
export const useLeadData = (filters, refreshKey, isAuthenticated, isAdmin = false) => {
    const [leads, setLeads] = useState(fallbackLeads)
    const [kpiData, setKpiData] = useState(() => buildKpisFromDataset(fallbackLeads))
    const [forecastSummary, setForecastSummary] = useState(() =>
        buildForecastFromDataset(fallbackLeads),
    )
    const [insightData, setInsightData] = useState(() => buildInsightsFromDataset(fallbackLeads))
    const [forecastData, setForecastData] = useState(null)  // Admin-only forecast data
    const [isLoading, setIsLoading] = useState(false)
    const [apiError, setApiError] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        const params = buildQueryParams(filters)
        const aggregateParams = { ...params }
        delete aggregateParams.page_size

        async function load() {
            if (!isAuthenticated) return

            setIsLoading(true)
            setApiError(null)
            try {
                // Base requests for all users
                const baseRequests = [
                    apiRequest('leads/', { params, signal: controller.signal }),
                    apiRequest('kpis/', { params: aggregateParams, signal: controller.signal }),
                ]

                // Admin users get forecast data
                if (isAdmin) {
                    baseRequests.push(
                        apiRequest('forecast/', { params: aggregateParams, signal: controller.signal })
                    )
                }

                const responses = await Promise.all(baseRequests)

                let leadResponse, kpiResponse, forecastResponse
                if (isAdmin) {
                    [leadResponse, kpiResponse, forecastResponse] = responses
                } else {
                    [leadResponse, kpiResponse] = responses
                }

                const serverLeads = leadResponse.results ?? leadResponse
                setLeads(serverLeads)
                setKpiData(formatKpisResponse(kpiResponse))
                // Build insights from client-side - this was working before!
                setInsightData(buildInsightsFromDataset(serverLeads))
                setForecastSummary(buildForecastFromDataset(serverLeads))

                // Set admin forecast data if available
                if (isAdmin && forecastResponse) {
                    setForecastData(forecastResponse)
                }
            } catch (error) {
                if (error.name === 'AbortError') return
                console.error(error)
                setApiError('Unable to reach the analytics API. Showing cached data.')
                setLeads((current) => (current.length ? current : fallbackLeads))
                setKpiData((current) =>
                    typeof current.total === 'number' ? current : buildKpisFromDataset(fallbackLeads),
                )
                setForecastSummary((current) =>
                    Array.isArray(current) && current.length ? current : buildForecastFromDataset(fallbackLeads),
                )
                setInsightData((current) =>
                    current && current.clusters?.length ? current : buildInsightsFromDataset(fallbackLeads),
                )
            } finally {
                setIsLoading(false)
            }
        }

        load()
        return () => controller.abort()
    }, [filters, refreshKey, isAuthenticated, isAdmin])

    return {
        leads,
        setLeads,
        kpiData,
        forecastSummary,
        insightData,
        forecastData,
        isLoading,
        apiError,
    }
}
