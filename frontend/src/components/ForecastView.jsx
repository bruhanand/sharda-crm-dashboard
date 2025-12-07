import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart, Legend } from 'recharts'
import './ChartsView.css' // Reuse Bento Grid styles
import ChartCard from './ChartCard'

const ForecastView = ({ forecastData }) => {
    const {
        leads_over_time = [],
        conversion_forecast = [],
        by_dealer = [],
        by_location = [],
        by_kva_range = {},
    } = forecastData || {}

    // Colors for different forecast charts
    const COLORS = {
        forecast: '#8b5cf6',
        conversion: '#6366f1',
        dealer: '#10b981',
        location: '#f59e0b',
        kva: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#f97316']
    }

    // Prepare KVA range stacked bar data
    const kvaForecastData = by_kva_range.forecast || []
    const kvaRanges = by_kva_range.kva_ranges || []

    return (
        <section className="charts-container">
            <div className="charts-header">
                <div>
                    <p className="eyebrow">Predictive Analytics</p>
                    <h2>Forecast & Projections</h2>
                    <p style={{ color: '#9ea4b9', marginTop: '8px', fontSize: '14px' }}>
                        🔮 AI-powered forecasts based on historical trends and patterns
                    </p>
                </div>
            </div>

            <div className="charts-bento-grid">
                {/* Forecasted Leads Over Time */}
                <ChartCard
                    eyebrow="Lead Projection"
                    title="Forecasted Leads Over Time (Next 6 Months)"
                    colSpan={2}
                    info="Predicted lead inflow based on historical monthly trends"
                >
                    {leads_over_time.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={leads_over_time} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.forecast} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.forecast} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="month"
                                    stroke="#9ea4b9"
                                    fontSize={12}
                                    tickFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                />
                                <YAxis stroke="#9ea4b9" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                    labelFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="forecasted_leads"
                                    stroke={COLORS.forecast}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorLeads)"
                                    name="Forecasted Leads"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">Insufficient data for forecast</div>
                    )}
                </ChartCard>

                {/* Forecasted Conversion Rate */}
                <ChartCard
                    eyebrow="Conversion Projection"
                    title="Forecasted Conversion Rate (%)"
                    colSpan={1}
                    info="Projected win rate based on historical conversion patterns"
                >
                    {conversion_forecast.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={conversion_forecast} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="month"
                                    stroke="#9ea4b9"
                                    fontSize={12}
                                    tickFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'short' })}
                                />
                                <YAxis stroke="#9ea4b9" fontSize={12} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                    formatter={(value) => `${value}%`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="forecasted_conversion"
                                    stroke={COLORS.conversion}
                                    strokeWidth={3}
                                    dot={{ fill: COLORS.conversion, r: 5 }}
                                    name="Conversion %"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">Insufficient data for forecast</div>
                    )}
                </ChartCard>

                {/* Forecast by Dealer */}
                <ChartCard
                    eyebrow="Dealer Performance Forecast"
                    title="Expected Monthly Wins by Dealer"
                    colSpan={1}
                    info="Projected wins based on historical dealer performance"
                >
                    {by_dealer.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={by_dealer.slice(0, 10)} layout="vertical" barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                <XAxis type="number" stroke="#9ea4b9" fontSize={12} />
                                <YAxis dataKey="dealer" type="category" stroke="#9ea4b9" fontSize={11} width={120} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                    formatter={(value, name) => {
                                        if (name === 'expected_monthly_wins') return [value, 'Expected Wins']
                                        if (name === 'win_rate') return [`${value}%`, 'Win Rate']
                                        return [value, name]
                                    }}
                                />
                                <Bar dataKey="expected_monthly_wins" fill={COLORS.dealer} radius={[0, 4, 4, 0]} maxBarSize={30} name="Expected Wins" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">Insufficient data for forecast</div>
                    )}
                </ChartCard>

                {/* Forecast by Location - Heatmap Alternative (Bar Chart) */}
                <ChartCard
                    eyebrow="Geographic Forecast"
                    title="Expected Monthly Leads by State"
                    colSpan={2}
                    info="Regional forecast based on historical state-level lead flow"
                >
                    {by_location.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={by_location.slice(0, 15)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                                <Bar dataKey="expected_monthly_leads" fill={COLORS.location} radius={[4, 4, 0, 0]} maxBarSize={50} name="Expected Leads" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">Insufficient data for forecast</div>
                    )}
                </ChartCard>

                {/* Forecast by KVA Range - Stacked Bar */}
                <ChartCard
                    eyebrow="Product Category Forecast"
                    title="Forecasted Leads by KVA Range (Stacked)"
                    colSpan={2}
                    info="Monthly projection broken down by KVA categories"
                >
                    {kvaForecastData.length > 0 && kvaRanges.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kvaForecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="month"
                                    stroke="#9ea4b9"
                                    fontSize={12}
                                    tickFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'short' })}
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
                                <Legend
                                    wrapperStyle={{ color: '#f5f6fa', fontSize: '12px' }}
                                    iconType="square"
                                />
                                {kvaRanges.map((range, index) => (
                                    <Bar
                                        key={range}
                                        dataKey={range}
                                        stackId="kva"
                                        fill={COLORS.kva[index % COLORS.kva.length]}
                                        radius={index === kvaRanges.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">Insufficient data for forecast</div>
                    )}
                </ChartCard>
            </div>
        </section>
    )
}

export default ForecastView
