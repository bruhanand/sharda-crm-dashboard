import { useState, useEffect, useMemo } from 'react'
import { 
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart, Legend 
} from 'recharts'
import { apiRequest } from '../lib/api'
import './ChartsView.css'
import ChartCard from './ChartCard'
import './ForecastView.css'

const ForecastView = ({ forecastData: legacyForecastData, filters, setFilters }) => {
    const [horizon, setHorizon] = useState('6M')
    const [metric, setMetric] = useState('both')
    const [selectedStates, setSelectedStates] = useState([])
    const [selectedDealers, setSelectedDealers] = useState([])
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [hierarchicalForecast, setHierarchicalForecast] = useState(null)
    const [stateOptions, setStateOptions] = useState([])
    const [dealerOptions, setDealerOptions] = useState([])
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)

    // Fetch state and dealer options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [statesRes, dealersRes] = await Promise.all([
                    apiRequest('lead-field-options/', { params: { field: 'state' } }),
                    apiRequest('lead-field-options/', { params: { field: 'dealer' } })
                ])
                setStateOptions(statesRes.options || [])
                setDealerOptions(dealersRes.options || [])
            } catch (error) {
                console.error('Error fetching options:', error)
            }
        }
        fetchOptions()
    }, [])

    const generateForecast = async () => {
        console.log('Generate Forecast button clicked')
        setIsGenerating(true)
        setError(null)
        setSuccessMessage(null)
        
        console.log('isGenerating set to true')
        
        try {
            const params = {
                horizon,
                metric,
                use_hierarchical: 'true'
            }

            // Add state filters
            if (selectedStates.length > 0) {
                params.state = selectedStates.join(',')
            }

            // Add dealer filters
            if (selectedDealers.length > 0) {
                params.dealer = selectedDealers.join(',')
            }

            // Add date range filters
            if (startDate) {
                params.start_date = startDate
            }
            if (endDate) {
                params.end_date = endDate
            }

            console.log('Generating forecast with params:', params)
            const response = await apiRequest('forecast/', { params })
            console.log('Forecast response received:', response)
            console.log('Range forecast:', response?.range_forecast)
            console.log('Sector forecast:', response?.sector_forecast)
            console.log('State forecast count:', response?.state_forecast?.length)
            console.log('Dealer forecast count:', response?.dealer_forecast?.length)
            console.log('Location forecast count:', response?.location_forecast?.length)
            
            if (response && (response.state_forecast || response.summary)) {
                setHierarchicalForecast(response)
                const summary = response.summary || {}
                setSuccessMessage(
                    `Forecast generated successfully! ` +
                    `${summary.num_states || 0} states, ` +
                    `${summary.num_dealers || 0} dealers, ` +
                    `${summary.num_locations || 0} locations, ` +
                    `${summary.num_ranges || 0} ranges, ` +
                    `${summary.num_sectors || 0} sectors forecasted.`
                )
            } else {
                throw new Error('Invalid response from server')
            }
        } catch (error) {
            console.error('Error generating forecast:', error)
            
            let errorMessage = 'Failed to generate forecast. Please try again.'
            
            if (error.message) {
                if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                    errorMessage = 'Authentication failed. Please log in again.'
                } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                    errorMessage = 'You do not have permission to generate forecasts. Admin access required.'
                } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
                    errorMessage = 'Server error occurred. Please try again later or contact support.'
                } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                    errorMessage = 'Network error: Unable to connect to server. Please check your connection.'
                } else {
                    errorMessage = error.message
                }
            }
            
            if (error.details) {
                console.error('Error details:', error.details)
                if (error.details.detail) {
                    errorMessage = error.details.detail
                } else if (error.details.error) {
                    errorMessage = error.details.error
                }
            }
            
            setError(errorMessage)
            setHierarchicalForecast(null)
        } finally {
            setIsGenerating(false)
        }
    }

    // Colors for different forecast charts
    const COLORS = {
        forecast: '#8b5cf6',
        conversion: '#6366f1',
        dealer: '#10b981',
        location: '#f59e0b',
        kva: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#f97316'],
        sector: ['#8b5cf6', '#6366f1', '#ec4899', '#f59e0b', '#10b981']
    }

    // Prepare data for visualization
    const forecastSummary = useMemo(() => {
        if (!hierarchicalForecast) return null

        const { state_forecast = [], dealer_forecast = [], location_forecast = [], 
                range_forecast = {}, sector_forecast = {}, summary = {} } = hierarchicalForecast

        // State forecast summary (aggregate weekly to monthly for display)
        const stateSummary = state_forecast.map(s => ({
            state: s.state,
            total_enquiries: s.total_forecasted_enquiries,
            total_value: s.total_forecasted_value,
            confidence: s.confidence
        }))

        // Dealer forecast by state
        const dealerByState = {}
        dealer_forecast.forEach(d => {
            const state = d.state || 'Unknown'
            if (!dealerByState[state]) dealerByState[state] = []
            dealerByState[state].push({
                dealer: d.dealer,
                total_enquiries: d.total_forecasted_enquiries,
                total_value: d.total_forecasted_value,
                confidence: d.confidence
            })
        })

        // Location forecast by dealer
        const locationByDealer = {}
        location_forecast.forEach(l => {
            const dealer = l.dealer || 'Unknown'
            if (!locationByDealer[dealer]) locationByDealer[dealer] = []
            locationByDealer[dealer].push({
                location: l.location,
                total_enquiries: l.total_forecasted_enquiries,
                total_value: l.total_forecasted_value,
                confidence: l.confidence
            })
        })

        // Range forecast (convert to chart format)
        // Backend returns: { "kva_range_name": { kva_range, forecast_weeks, total_forecasted_enquiries, ... } }
        let rangeChartData = []
        if (range_forecast && typeof range_forecast === 'object' && !Array.isArray(range_forecast)) {
            rangeChartData = Object.entries(range_forecast)
                .map(([key, r]) => ({
                    range: r.kva_range || key || 'Unknown',
                    total_enquiries: r.total_forecasted_enquiries || 0,
                    total_value: r.total_forecasted_value || 0,
                    confidence: r.confidence || 'low'
                }))
                .filter(r => r.range && r.range !== 'Unknown')
        } else if (Array.isArray(range_forecast)) {
            rangeChartData = range_forecast.map(r => ({
                range: r.kva_range || 'Unknown',
                total_enquiries: r.total_forecasted_enquiries || 0,
                total_value: r.total_forecasted_value || 0,
                confidence: r.confidence || 'low'
            }))
        }

        // Sector forecast (convert to chart format)
        // Backend returns: { "segment_name": { sector, forecast_weeks, total_forecasted_enquiries, ... } }
        let sectorChartData = []
        if (sector_forecast && typeof sector_forecast === 'object' && !Array.isArray(sector_forecast)) {
            sectorChartData = Object.entries(sector_forecast)
                .map(([key, s]) => ({
                    sector: s.sector || key || 'Unknown',
                    total_enquiries: s.total_forecasted_enquiries || 0,
                    total_value: s.total_forecasted_value || 0,
                    confidence: s.confidence || 'low'
                }))
                .filter(s => s.sector && s.sector !== 'Unknown')
        } else if (Array.isArray(sector_forecast)) {
            sectorChartData = sector_forecast.map(s => ({
                sector: s.sector || 'Unknown',
                total_enquiries: s.total_forecasted_enquiries || 0,
                total_value: s.total_forecasted_value || 0,
                confidence: s.confidence || 'low'
            }))
        }
        
        console.log('Range forecast data:', range_forecast, 'Processed:', rangeChartData)
        console.log('Sector forecast data:', sector_forecast, 'Processed:', sectorChartData)
        console.log('Full hierarchical forecast:', hierarchicalForecast)

        return {
            stateSummary,
            dealerByState,
            locationByDealer,
            rangeChartData,
            sectorChartData,
            summary
        }
    }, [hierarchicalForecast])

    return (
        <section className="charts-container forecast-view-container">
            <div className="charts-header">
                <div>
                    <p className="eyebrow">Auto Forecast Engine</p>
                    <h2>Hierarchical Demand Forecast</h2>
                    <p style={{ color: '#9ea4b9', marginTop: '8px', fontSize: '14px' }}>
                        🔮 Complete hierarchical forecast: State → Dealer → Location + Range & Sector
                    </p>
                </div>
            </div>

            {/* Forecast Input Form */}
            <div className="forecast-input-panel">
                <div className="forecast-input-row">
                    <div className="forecast-input-group">
                        <label>
                            Forecast Horizon *
                            <span className="info-icon" title="How far into the future to forecast">ℹ️</span>
                        </label>
                        <select 
                            value={horizon} 
                            onChange={(e) => setHorizon(e.target.value)}
                            disabled={isGenerating}
                        >
                            <option value="3M">3 Months (12 weeks)</option>
                            <option value="6M">6 Months (24 weeks)</option>
                            <option value="12M">1 Year (52 weeks)</option>
                        </select>
                        <small>
                            <strong>What it does:</strong> Forecasts demand for the selected period ahead. Longer horizons may have lower confidence.
                        </small>
                    </div>

                    <div className="forecast-input-group">
                        <label>
                            Metric
                            <span className="info-icon" title="What to forecast: enquiry count, order value, or both">ℹ️</span>
                        </label>
                        <select 
                            value={metric} 
                            onChange={(e) => setMetric(e.target.value)}
                            disabled={isGenerating}
                        >
                            <option value="both">Both (Enquiries & Value)</option>
                            <option value="enquiries">Enquiries Only</option>
                            <option value="order_value">Order Value Only</option>
                        </select>
                        <small>
                            <strong>What it does:</strong> Choose what to forecast - number of enquiries, total order value, or both metrics together.
                        </small>
                    </div>

                    <div className="forecast-input-group">
                        <label>
                            State Filter (Optional)
                            <span className="info-icon" title="Filter forecast to specific states only">ℹ️</span>
                        </label>
                        <select 
                            multiple
                            value={selectedStates}
                            onChange={(e) => {
                                const values = Array.from(e.target.selectedOptions, option => option.value)
                                setSelectedStates(values)
                            }}
                            disabled={isGenerating}
                            size="3"
                        >
                            {stateOptions.length > 0 ? (
                                stateOptions.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))
                            ) : (
                                <option disabled>Loading states...</option>
                            )}
                        </select>
                        <small>
                            <strong>What it does:</strong> Limit forecast to selected states only. Leave empty to forecast all states.
                            <br />
                            <strong>Tip:</strong> Hold Ctrl (Windows) or Cmd (Mac) to select multiple states.
                        </small>
                    </div>

                    <div className="forecast-input-group">
                        <label>
                            Dealer Filter (Optional)
                            <span className="info-icon" title="Filter forecast to specific dealers only">ℹ️</span>
                        </label>
                        <select 
                            multiple
                            value={selectedDealers}
                            onChange={(e) => {
                                const values = Array.from(e.target.selectedOptions, option => option.value)
                                setSelectedDealers(values)
                            }}
                            disabled={isGenerating}
                            size="3"
                        >
                            {dealerOptions.length > 0 ? (
                                dealerOptions.map(dealer => (
                                    <option key={dealer} value={dealer}>{dealer}</option>
                                ))
                            ) : (
                                <option disabled>Loading dealers...</option>
                            )}
                        </select>
                        <small>
                            <strong>What it does:</strong> Limit forecast to selected dealers only. Leave empty to forecast all dealers.
                            <br />
                            <strong>Tip:</strong> Hold Ctrl (Windows) or Cmd (Mac) to select multiple dealers.
                        </small>
                    </div>
                </div>

                <div className="forecast-input-row">
                    <div className="forecast-input-group">
                        <label>
                            Start Date (Optional)
                            <span className="info-icon" title="Filter historical data: Only use enquiries from this date onwards for training the forecast models">ℹ️</span>
                        </label>
                        <div 
                            className="date-input-wrapper"
                            onClick={() => {
                                if (!isGenerating) {
                                    const input = document.getElementById('start-date-input')
                                    if (input) {
                                        // Try showPicker() first (modern browsers)
                                        if (typeof input.showPicker === 'function') {
                                            input.showPicker()
                                        } else {
                                            // Fallback: focus and click
                                            input.focus()
                                            input.click()
                                        }
                                    }
                                }
                            }}
                        >
                            <input 
                                type="date"
                                id="start-date-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={isGenerating}
                                className="date-input"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (!isGenerating) {
                                        const input = e.target
                                        if (typeof input.showPicker === 'function') {
                                            input.showPicker()
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="calendar-icon-btn"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const input = document.getElementById('start-date-input')
                                    if (input && !isGenerating) {
                                        if (typeof input.showPicker === 'function') {
                                            input.showPicker()
                                        } else {
                                            input.focus()
                                            input.click()
                                        }
                                    }
                                }}
                                disabled={isGenerating}
                                title="Open calendar"
                            >
                                📅
                            </button>
                        </div>
                        <small>
                            <strong>Purpose:</strong> Limit historical data used for forecasting. Only enquiries from this date onwards will be used to train the SARIMA models.
                            <br />
                            <strong>Example:</strong> Set to 6 months ago to use only recent data, ignoring older patterns.
                        </small>
                    </div>

                    <div className="forecast-input-group">
                        <label>
                            End Date (Optional)
                            <span className="info-icon" title="Filter historical data: Only use enquiries up to this date for training the forecast models">ℹ️</span>
                        </label>
                        <div 
                            className="date-input-wrapper"
                            onClick={() => {
                                if (!isGenerating) {
                                    const input = document.getElementById('end-date-input')
                                    if (input) {
                                        // Try showPicker() first (modern browsers)
                                        if (typeof input.showPicker === 'function') {
                                            input.showPicker()
                                        } else {
                                            // Fallback: focus and click
                                            input.focus()
                                            input.click()
                                        }
                                    }
                                }
                            }}
                        >
                            <input 
                                type="date"
                                id="end-date-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={isGenerating}
                                className="date-input"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (!isGenerating) {
                                        const input = e.target
                                        if (typeof input.showPicker === 'function') {
                                            input.showPicker()
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="calendar-icon-btn"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const input = document.getElementById('end-date-input')
                                    if (input && !isGenerating) {
                                        if (typeof input.showPicker === 'function') {
                                            input.showPicker()
                                        } else {
                                            input.focus()
                                            input.click()
                                        }
                                    }
                                }}
                                disabled={isGenerating}
                                title="Open calendar"
                            >
                                📅
                            </button>
                        </div>
                        <small>
                            <strong>Purpose:</strong> Limit historical data used for forecasting. Only enquiries up to this date will be used to train the SARIMA models.
                            <br />
                            <strong>Example:</strong> Set to exclude recent anomalies or focus on a specific time period.
                        </small>
                    </div>

                    <div className="forecast-input-group forecast-generate-btn">
                        <button 
                            onClick={(e) => {
                                e.preventDefault()
                                console.log('Button clicked, calling generateForecast')
                                generateForecast()
                            }}
                            disabled={isGenerating}
                            className="generate-forecast-btn"
                            type="button"
                        >
                            {isGenerating ? (
                                <>
                                    <span style={{ marginRight: '8px' }}>⏳</span>
                                    Generating Forecast...
                                </>
                            ) : (
                                'Generate Forecast Report'
                            )}
                        </button>
                        {isGenerating && (
                            <small style={{ 
                                color: '#8b5cf6', 
                                marginTop: '8px', 
                                display: 'block',
                                textAlign: 'center',
                                fontWeight: '500'
                            }}>
                                Please wait, this may take 30-60 seconds...
                            </small>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="forecast-error-message" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginTop: '24px',
                    color: '#ef4444'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <strong style={{ fontSize: '16px' }}>Error Generating Forecast</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{error}</p>
                </div>
            )}

            {/* Success Message */}
            {successMessage && !error && (
                <div className="forecast-success-message" style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginTop: '24px',
                    color: '#10b981'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>✅</span>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Message when no forecast generated yet */}
            {!hierarchicalForecast && !isGenerating && !error && (
                <div className="forecast-info-panel">
                    <div className="info-section">
                        <h4>📋 How to Generate Forecast</h4>
                        <ol>
                            <li>Select a <strong>Forecast Horizon</strong> (3 months, 6 months, or 1 year)</li>
                            <li>Choose a <strong>Metric</strong> (Enquiries, Order Value, or Both)</li>
                            <li>Optionally filter by <strong>State</strong> and/or <strong>Dealer</strong></li>
                            <li>Optionally set <strong>Date Range</strong> to limit historical data</li>
                            <li>Click <strong>"Generate Forecast Report"</strong></li>
                        </ol>
                    </div>
                    
                    <div className="info-section">
                        <h4>📊 What You'll Get</h4>
                        <ul>
                            <li><strong>State Forecast:</strong> Root-level demand prediction by state using SARIMA models</li>
                            <li><strong>Dealer Forecast:</strong> Dealer-level breakdowns that reconcile with state totals</li>
                            <li><strong>Location Forecast:</strong> Location-level breakdowns that reconcile with dealer totals</li>
                            <li><strong>Range Forecast:</strong> Independent KVA range forecasts for product mix insights</li>
                            <li><strong>Sector Forecast:</strong> Independent sector (segment) forecasts for market insights</li>
                        </ul>
                    </div>

                    <div className="info-section warning">
                        <h4>⚠️ Why Data Might Not Be Available</h4>
                        <ul>
                            <li><strong>Insufficient Historical Data:</strong> Need at least 12 weeks of historical data for accurate SARIMA forecasting</li>
                            <li><strong>Date Range Too Narrow:</strong> If start/end dates exclude most data, forecasts may be unavailable</li>
                            <li><strong>Filtered Out:</strong> State/Dealer filters might exclude all relevant data</li>
                            <li><strong>No Enquiries in Period:</strong> Selected date range or filters may have no matching enquiries</li>
                            <li><strong>Data Quality:</strong> Missing state, dealer, or location fields in historical data</li>
                        </ul>
                        <p style={{ marginTop: '12px', color: '#f59e0b' }}>
                            <strong>Tip:</strong> Remove filters or expand date range to see more forecast data. The system uses proportional allocation when SARIMA models can't be trained due to sparse data.
                        </p>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {isGenerating && (
                <div className="forecast-loading-message" style={{
                    background: '#1a1d24',
                    border: '2px solid rgba(139, 92, 246, 0.5)',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    marginTop: '24px',
                    animation: 'pulse 2s ease-in-out infinite'
                }}>
                    <div style={{ 
                        color: '#8b5cf6', 
                        fontSize: '24px', 
                        marginBottom: '16px',
                        fontWeight: '600'
                    }}>
                        ⏳ Generating Forecast...
                    </div>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid rgba(139, 92, 246, 0.2)',
                        borderTop: '4px solid #8b5cf6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{ color: '#9ea4b9', fontSize: '14px', marginBottom: '8px' }}>
                        Training SARIMA models and calculating hierarchical forecasts...
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
                        This may take 30-60 seconds depending on data size
                    </p>
                </div>
            )}

            {/* Forecast Results */}
            {hierarchicalForecast && forecastSummary && (
                <div className="forecast-results">
                    {/* Summary Card */}
                    <div className="forecast-summary-card">
                        <h3>Forecast Summary</h3>
                        <div className="summary-stats">
                            <div className="summary-stat">
                                <label>Total Forecasted Enquiries</label>
                                <span className="stat-value">{forecastSummary.summary.total_forecasted_enquiries?.toLocaleString() || 0}</span>
                            </div>
                            <div className="summary-stat">
                                <label>Total Forecasted Value</label>
                                <span className="stat-value">₹{forecastSummary.summary.total_forecasted_value?.toLocaleString() || 0}</span>
                            </div>
                            <div className="summary-stat">
                                <label>Confidence</label>
                                <span className={`stat-value confidence-${forecastSummary.summary.confidence}`}>
                                    {forecastSummary.summary.confidence?.toUpperCase() || 'LOW'}
                                </span>
                            </div>
                            <div className="summary-stat">
                                <label>Horizon</label>
                                <span className="stat-value">{hierarchicalForecast.horizon}</span>
                            </div>
                        </div>
                    </div>

                    <div className="charts-bento-grid">
                        {/* State Forecast */}
                <ChartCard
                            eyebrow="State-Level Forecast"
                            title="Forecast by State"
                    colSpan={2}
                            info="Root-level state forecasts using SARIMA models"
                >
                            {forecastSummary.stateSummary.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={forecastSummary.stateSummary.slice(0, 15)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="state"
                                    stroke="#9ea4b9"
                                    fontSize={11}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis stroke="#9ea4b9" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                />
                                        <Bar dataKey="total_enquiries" fill={COLORS.forecast} radius={[4, 4, 0, 0]} name="Forecasted Enquiries" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                                <div className="no-data">No state forecast data available</div>
                    )}
                </ChartCard>

                        {/* Range Forecast */}
                <ChartCard
                            eyebrow="Product Range Forecast"
                            title="Forecast by KVA Range"
                    colSpan={2}
                            info="Independent range forecasts for product mix insights"
                >
                            {forecastSummary.rangeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={forecastSummary.rangeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                            dataKey="range"
                                    stroke="#9ea4b9"
                                            fontSize={11}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                />
                                <YAxis stroke="#9ea4b9" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                />
                                        <Bar dataKey="total_enquiries" fill={COLORS.kva[0]} radius={[4, 4, 0, 0]} name="Forecasted Enquiries" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                                <div className="no-data">No range forecast data available</div>
                            )}
                        </ChartCard>

                        {/* Sector Forecast */}
                        <ChartCard
                            eyebrow="Sector Forecast"
                            title="Forecast by Sector (Segment)"
                            colSpan={2}
                            info="Independent sector forecasts for market insights"
                        >
                            {forecastSummary.sectorChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={forecastSummary.sectorChartData.slice(0, 10)}
                                            dataKey="total_enquiries"
                                            nameKey="sector"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(entry) => entry.sector}
                                        >
                                            {forecastSummary.sectorChartData.slice(0, 10).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.sector[index % COLORS.sector.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: '#1a1d24',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#f5f6fa',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="no-data">No sector forecast data available</div>
                    )}
                </ChartCard>
            </div>

                    {/* Detailed Breakdown Tables */}
                    <div className="forecast-details">
                        <h3>Detailed Forecast Breakdown</h3>
                        
                        {/* State → Dealer Breakdown */}
                        {Object.keys(forecastSummary.dealerByState).length > 0 && (
                            <div className="forecast-breakdown-section">
                                <h4>State → Dealer Breakdown</h4>
                                {Object.entries(forecastSummary.dealerByState).slice(0, 5).map(([state, dealers]) => (
                                    <div key={state} className="breakdown-group">
                                        <h5>{state} ({dealers.length} dealers)</h5>
                                        <div className="breakdown-table">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Dealer</th>
                                                        <th>Forecasted Enquiries</th>
                                                        <th>Forecasted Value</th>
                                                        <th>Confidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dealers.slice(0, 10).map((dealer, idx) => (
                                                        <tr key={idx}>
                                                            <td>{dealer.dealer}</td>
                                                            <td>{dealer.total_enquiries?.toLocaleString() || 0}</td>
                                                            <td>₹{dealer.total_value?.toLocaleString() || 0}</td>
                                                            <td className={`confidence-${dealer.confidence}`}>
                                                                {dealer.confidence?.toUpperCase() || 'LOW'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Dealer → Location Breakdown */}
                        {Object.keys(forecastSummary.locationByDealer).length > 0 && (
                            <div className="forecast-breakdown-section">
                                <h4>Dealer → Location Breakdown</h4>
                                {Object.entries(forecastSummary.locationByDealer).slice(0, 5).map(([dealer, locations]) => (
                                    <div key={dealer} className="breakdown-group">
                                        <h5>{dealer} ({locations.length} locations)</h5>
                                        <div className="breakdown-table">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Location</th>
                                                        <th>Forecasted Enquiries</th>
                                                        <th>Forecasted Value</th>
                                                        <th>Confidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {locations.slice(0, 10).map((location, idx) => (
                                                        <tr key={idx}>
                                                            <td>{location.location}</td>
                                                            <td>{location.total_enquiries?.toLocaleString() || 0}</td>
                                                            <td>₹{location.total_value?.toLocaleString() || 0}</td>
                                                            <td className={`confidence-${location.confidence}`}>
                                                                {location.confidence?.toUpperCase() || 'LOW'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Range Forecast Details */}
                        {forecastSummary.rangeChartData && forecastSummary.rangeChartData.length > 0 && (
                            <div className="forecast-breakdown-section">
                                <h4>KVA Range Forecast Details</h4>
                                <div className="breakdown-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>KVA Range</th>
                                                <th>Forecasted Enquiries</th>
                                                <th>Forecasted Value</th>
                                                <th>Confidence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {forecastSummary.rangeChartData.map((range, idx) => (
                                                <tr key={idx}>
                                                    <td>{range.range}</td>
                                                    <td>{range.total_enquiries?.toLocaleString() || 0}</td>
                                                    <td>₹{range.total_value?.toLocaleString() || 0}</td>
                                                    <td className={`confidence-${range.confidence || 'low'}`}>
                                                        {(range.confidence || 'LOW').toUpperCase()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Sector Forecast Details */}
                        {forecastSummary.sectorChartData && forecastSummary.sectorChartData.length > 0 && (
                            <div className="forecast-breakdown-section">
                                <h4>Sector Forecast Details</h4>
                                <div className="breakdown-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Sector</th>
                                                <th>Forecasted Enquiries</th>
                                                <th>Forecasted Value</th>
                                                <th>Confidence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {forecastSummary.sectorChartData.map((sector, idx) => (
                                                <tr key={idx}>
                                                    <td>{sector.sector}</td>
                                                    <td>{sector.total_enquiries?.toLocaleString() || 0}</td>
                                                    <td>₹{sector.total_value?.toLocaleString() || 0}</td>
                                                    <td className={`confidence-${sector.confidence || 'low'}`}>
                                                        {(sector.confidence || 'LOW').toUpperCase()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    )
}

export default ForecastView
