import { useMemo } from 'react'
import { getDateRangeLabel, rupeeFormatter } from '../lib/analytics'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import './ChartsView.css'
import ChartCard from './ChartCard'

const CHART_COLORS = ['#7fd3ff', '#6be585', '#f5aa3c', '#ff6584', '#a78bfa', '#fbbf24']

const ChartsView = ({ filters, chartVisuals }) => {
    const {
        monthlyLeads = [],
        conversionTrend = [],
        statusSummary = [],
        segmentDistribution = [],
        segmentStatus = [],
        segmentCloseDays = [],
        avgCloseDays,
    } = chartVisuals

    // Group small segments into "Others" to avoid clutter
    const processedSegments = useMemo(() => {
        if (!segmentDistribution.length) return []
        const sorted = [...segmentDistribution].sort((a, b) => b.value - a.value)
        if (sorted.length <= 10) return sorted

        const top = sorted.slice(0, 9)
        const others = sorted.slice(9)
        const othersValue = others.reduce((sum, item) => sum + item.value, 0)

        return [...top, { segment: 'Others', value: othersValue }]
    }, [segmentDistribution])

    return (
        <div className="charts-container">
            <div className="charts-header">
                <div>
                    <p className="eyebrow">Visual Analytics</p>
                    <h2>Data Insights</h2>
                </div>
                <span className="charts-date">
                    {getDateRangeLabel(filters.startDate, filters.endDate)}
                </span>
            </div>

            <div className="charts-bento-grid">
                {/* Monthly Lead Volume */}
                <ChartCard eyebrow="Timeline" title="Monthly Lead Volume" colSpan={1}>
                    {monthlyLeads.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyLeads} barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="label" stroke="#9ea4b9" fontSize={12} />
                                <YAxis stroke="#9ea4b9" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#f5f6fa',
                                        padding: '12px',
                                    }}
                                    labelStyle={{ color: '#f5f6fa', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Bar dataKey="leads" fill="#7fd3ff" radius={[10, 10, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No data available</div>
                    )}
                </ChartCard>

                {/* Conversion Rate Trend */}
                <ChartCard eyebrow="Performance" title="Conversion Rate Trend" colSpan={1}>
                    {conversionTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={conversionTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="label" stroke="#9ea4b9" fontSize={12} />
                                <YAxis stroke="#9ea4b9" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#f5f6fa',
                                        padding: '12px',
                                    }}
                                    labelStyle={{ color: '#f5f6fa', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="conversion"
                                    stroke="#6be585"
                                    strokeWidth={3}
                                    dot={{ fill: '#6be585', r: 5 }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No data available</div>
                    )}
                </ChartCard>

                {/* Lead Status */}
                <ChartCard eyebrow="Distribution" title="Lead Status" colSpan={1}>
                    {statusSummary.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                <Pie
                                    data={statusSummary}
                                    dataKey="value"
                                    nameKey="label"
                                    cx="40%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={120}
                                    label={({ label, value }) => `${label}: ${value}`}
                                    labelLine={{ stroke: '#f5f6fa', strokeWidth: 1 }}
                                >
                                    {statusSummary.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(0, 0, 0, 0.95)',
                                        border: '2px solid rgba(127, 211, 255, 0.5)',
                                        borderRadius: '12px',
                                        color: '#ffffff',
                                        padding: '16px 20px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
                                    }}
                                    formatter={(value, name) => [
                                        <span style={{ color: '#7fd3ff', fontSize: '18px' }}>{value} leads</span>,
                                        <span style={{ color: '#f5f6fa', fontSize: '16px' }}>{name}</span>
                                    ]}
                                />
                                <Legend
                                    wrapperStyle={{
                                        color: '#f5f6fa',
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        paddingLeft: '10px',
                                        fontSize: '12px'
                                    }}
                                    iconType="circle"
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No data available</div>
                    )}
                </ChartCard>

                {/* Lead Distribution - Takes 2 columns */}
                <ChartCard eyebrow="Segments" title="Lead Distribution" colSpan={2}>
                    {processedSegments.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                <Pie
                                    data={processedSegments}
                                    dataKey="value"
                                    nameKey="segment"
                                    cx="35%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={2}
                                >
                                    {processedSegments.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(0, 0, 0, 0.95)',
                                        border: '2px solid rgba(127, 211, 255, 0.5)',
                                        borderRadius: '12px',
                                        color: '#ffffff',
                                        padding: '16px 20px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
                                    }}
                                    formatter={(value, name) => [
                                        <span style={{ color: '#7fd3ff', fontSize: '18px' }}>{value} leads</span>,
                                        <span style={{ color: '#f5f6fa', fontSize: '16px' }}>{name}</span>
                                    ]}
                                />
                                <Legend
                                    wrapperStyle={{
                                        color: '#f5f6fa',
                                        maxHeight: '360px',
                                        overflowY: 'auto',
                                        paddingLeft: '10px',
                                        fontSize: '13px'
                                    }}
                                    iconType="circle"
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No data available</div>
                    )}
                </ChartCard>

                {/* Open vs Closed by Segment */}
                <ChartCard eyebrow="Segment Analysis" title="Open vs Closed by Segment" colSpan={1}>
                    {segmentStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={segmentStatus} barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="segment" stroke="#9ea4b9" fontSize={11} angle={-45} textAnchor="end" height={90} />
                                <YAxis stroke="#9ea4b9" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#f5f6fa',
                                        padding: '12px',
                                    }}
                                    labelStyle={{ color: '#f5f6fa', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Legend wrapperStyle={{ color: '#f5f6fa' }} />
                                <Bar dataKey="open" fill="#7fd3ff" radius={[10, 10, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="closed" fill="#6be585" radius={[10, 10, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No data available</div>
                    )}
                </ChartCard>

                {/* Average Close Days - Full Width, Standard Height */}
                <ChartCard
                    eyebrow="Efficiency"
                    title="Average Close Days by Segment"
                    colSpan={2}
                    rowSpan={1}
                    headerAction={avgCloseDays && `Overall Avg: ${avgCloseDays} days`}
                >
                    {segmentCloseDays.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={segmentCloseDays} layout="vertical" barCategoryGap="10%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="#9ea4b9" fontSize={12} />
                                <YAxis dataKey="segment" type="category" stroke="#9ea4b9" fontSize={12} width={160} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#f5f6fa',
                                        padding: '12px',
                                    }}
                                    labelStyle={{ color: '#f5f6fa', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Bar dataKey="avgCloseDays" fill="#f5aa3c" radius={[0, 10, 10, 0]} maxBarSize={35} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No data available</div>
                    )}
                </ChartCard>
            </div>
        </div>
    )
}

export default ChartsView
