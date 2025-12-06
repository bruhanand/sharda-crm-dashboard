/**
 * Filter utility functions
 */

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
