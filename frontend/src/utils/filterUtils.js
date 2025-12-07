/**
 * Filter utility functions
 */

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Get FY dates based on selection type
 * @param {string} fyType - 'current', 'previous', or 'custom'
 * @returns {Object} { startDate, endDate }
 */
export const getFYDates = (fyType) => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1 // 1-12

    // Determine current FY start year
    // If current month is Apr(4) or later, FY started this year
    // Otherwise, FY started last year
    const currentFYStartYear = month >= 4 ? year : year - 1

    switch (fyType) {
        case 'current':
            return {
                startDate: `${currentFYStartYear}-04-01`,
                endDate: formatDate(today)
            }
        case 'previous':
            const prevFYStartYear = currentFYStartYear - 1
            return {
                startDate: `${prevFYStartYear}-04-01`,
                endDate: `${prevFYStartYear + 1}-03-31`
            }
        case 'custom':
        default:
            return {
                startDate: '',
                endDate: ''
            }
    }
}

/**
 * Get readable FY label
 * @param {string} fyType - 'current' or 'previous'
 * @returns {string} FY label like "FY 2024-25"
 */
export const getFYLabel = (fyType) => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const currentFYStartYear = month >= 4 ? year : year - 1

    if (fyType === 'current') {
        return `FY ${currentFYStartYear}-${String(currentFYStartYear + 1).slice(-2)}`
    } else if (fyType === 'previous') {
        const prevFYStartYear = currentFYStartYear - 1
        return `FY ${prevFYStartYear}-${String(prevFYStartYear + 1).slice(-2)}`
    }
    return 'Custom Range'
}

/**
 * Get current FY value (for dropdown)
 * @returns {string} e.g., "FY2025"
 */
export const getCurrentFY = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const currentFYStartYear = month >= 4 ? year : year - 1
    return `FY${currentFYStartYear}`
}

/**
 * Generate all FY options for dropdown
 * Shows last 5 FYs + current FY + custom
 * @returns {Array} FY options with value, label, startDate, endDate
 */
export const generateFYOptions = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1

    // Determine current FY start year
    const currentFYStartYear = month >= 4 ? year : year - 1

    const options = []

    // Add last 5 FYs + current (total 6 FYs)
    for (let i = 5; i >= 0; i--) {
        const fyStart = currentFYStartYear - i
        const isCurrent = i === 0

        options.push({
            value: `FY${fyStart}`,
            label: `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`,
            startDate: `${fyStart}-04-01`,
            endDate: isCurrent
                ? formatDate(today) // Current FY ends today
                : `${fyStart + 1}-03-31` // Past FY ends March 31
        })
    }

    // Add "Custom Range" option
    options.push({
        value: 'custom',
        label: 'Custom Range',
        startDate: '',
        endDate: ''
    })

    return options
}

/**
 * Get FY dates from FY value
 * @param {string} fyValue - e.g., "FY2025" or "custom"
 * @returns {Object} { startDate, endDate }
 */
export const getFYDatesFromValue = (fyValue) => {
    if (fyValue === 'custom') {
        return { startDate: '', endDate: '' }
    }

    const options = generateFYOptions()
    const selected = options.find(opt => opt.value === fyValue)

    if (selected) {
        return {
            startDate: selected.startDate,
            endDate: selected.endDate
        }
    }

    // Fallback to empty
    return { startDate: '', endDate: '' }
}

export const initialFilters = {
    dateRangeType: 'enquiry',
    startDate: '',
    endDate: '',
    leadStatus: 'all',
    leadStage: 'all',
    dealer: 'all',
    state: 'all',
    city: 'all',
    segment: 'all',
    kvaRange: 'all',
    owner: 'all',
    source: 'all',
    fy: 'all',
    month: 'all',
    zone: 'all',
    highValueOnly: false,
    followupDueOnly: false,
}

export const buildQueryParams = (filters) => {
    const params = {
        date_mode: filters.dateRangeType,
        page_size: 500,
    }

    if (filters.startDate) params.start_date = filters.startDate
    if (filters.endDate) params.end_date = filters.endDate

    // Map filters to query params
    const selectFilterMap = {
        leadStatus: 'lead_status',
        leadStage: 'lead_stage',
        dealer: 'dealer',
        state: 'state',
        city: 'city',
        segment: 'segment',
        kvaRange: 'kva_range',
        owner: 'owner',
        source: 'source',
        fy: 'fy',
        month: 'month',
        zone: 'zone',
    }

    Object.entries(selectFilterMap).forEach(([stateKey, queryKey]) => {
        const value = filters[stateKey]
        if (value && value !== 'all') {
            params[queryKey] = value
        }
    })

    if (filters.highValueOnly) params.high_value_only = 'true'
    if (filters.followupDueOnly) params.followup_due_only = 'true'

    return params
}
