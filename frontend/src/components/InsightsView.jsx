import { useState } from 'react'
import { rupeeFormatter } from '../lib/analytics'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, ZAxis, Legend } from 'recharts'
import './ChartsView.css' // Reuse Bento Grid styles
import ChartCard from './ChartCard'

const CLUSTER_COLORS = {
    'Fast Closure': '#6be585',
    'Long Follow Up Time': '#f5aa3c',
    'High Engage': '#7fd3ff',
    'No Follow-Up': '#ff6584',
}

const InsightsView = ({ insightData, topDealers = [], topEmployees = [] }) => {
    const {
        highValueCount = 0,
        overdueFollowups = 0,
        lossReasons = [],
        fastestSegments = [],
        clusters = [],
        employeeConversion = [],
        followupVsConversion = [],
    } = insightData || {}

    // Filter states for Top charts
    const [dealersLimit, setDealersLimit] = useState(10)
    const [employeesLimit, setEmployeesLimit] = useState(10)

    // Filtered data
    const filteredTopDealers = topDealers.slice(0, dealersLimit)
    const filteredTopEmployees = topEmployees.slice(0, employeesLimit)

    return (
        <section className="charts-container">
            <div className="charts-header">
                <div>
                    <p className="eyebrow">Advanced Analytics</p>
                    <h2>Lead Behavior & Performance Insights</h2>
                </div>
            </div>

            {/* High-level metrics */}
            <div className="insights-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    background: 'rgba(24, 24, 27, 0.5)',
                    border: '1px solid #27272a',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <h2 style={{ color: '#6be585', fontSize: '3rem', margin: 0, lineHeight: 1 }}>{highValueCount}</h2>
                    <p style={{ color: '#f5f6fa', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginTop: '8px', fontWeight: 600 }}>High-Value Leads</p>
                    <small style={{ color: '#9ea4b9', fontSize: '12px' }}>Leads exceeding ₹10L threshold</small>
                </div>

                <div style={{
                    background: 'rgba(24, 24, 27, 0.5)',
                    border: '1px solid #27272a',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <h2 style={{ color: '#ff6584', fontSize: '3rem', margin: 0, lineHeight: 1 }}>{overdueFollowups}</h2>
                    <p style={{ color: '#f5f6fa', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', marginTop: '8px', fontWeight: 600 }}>Overdue Follow-Ups</p>
                    <small style={{ color: '#9ea4b9', fontSize: '12px' }}>Requires immediate attention</small>
                </div>
            </div>

            <div className="charts-bento-grid">
                {/* Top Dealers Chart */}
                <ChartCard
                    eyebrow="Performance Rankings"
                    title="Top Dealers by Lead Count"
                    colSpan={1}
                    rowSpan={dealersLimit > 10 ? 2 : 1}
                    headerAction={
                        <select
                            value={dealersLimit}
                            onChange={(e) => setDealersLimit(Number(e.target.value))}
                            style={{ background: '#1a1d24', border: '1px solid #3f3f46', color: '#f5f6fa', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
                        >
                            <option value={5}>Top 5</option>
                            <option value={10}>Top 10</option>
                            <option value={15}>Top 15</option>
                            <option value={20}>Top 20</option>
                        </select>
                    }
                >
                    {filteredTopDealers.length > 0 ? (
                        <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingRight: '10px' }}>
                            <div style={{ height: Math.max(300, filteredTopDealers.length * 40), width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredTopDealers} layout="vertical" barCategoryGap="15%" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="#9ea4b9" fontSize={12} />
                                        <YAxis dataKey="dealer" type="category" stroke="#9ea4b9" fontSize={11} width={100} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{
                                                background: '#1a1d24',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#f5f6fa',
                                            }}
                                            labelStyle={{ color: '#f5f6fa' }}
                                            itemStyle={{ color: '#f5f6fa' }}
                                        />
                                        <Bar dataKey="leads" fill="#7fd3ff" radius={[0, 4, 4, 0]} maxBarSize={25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No Data Available for this Range</div>
                    )}
                </ChartCard>

                {/* Top Employees Chart */}
                <ChartCard
                    eyebrow="Team Performance"
                    title="Top Employees by Lead Count"
                    colSpan={1}
                    rowSpan={employeesLimit > 10 ? 2 : 1}
                    headerAction={
                        <select
                            value={employeesLimit}
                            onChange={(e) => setEmployeesLimit(Number(e.target.value))}
                            style={{ background: '#1a1d24', border: '1px solid #3f3f46', color: '#f5f6fa', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
                        >
                            <option value={5}>Top 5</option>
                            <option value={10}>Top 10</option>
                            <option value={15}>Top 15</option>
                            <option value={20}>Top 20</option>
                        </select>
                    }
                >
                    {filteredTopEmployees.length > 0 ? (
                        <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingRight: '10px' }}>
                            <div style={{ height: Math.max(300, filteredTopEmployees.length * 40), width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredTopEmployees} layout="vertical" barCategoryGap="15%" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="#9ea4b9" fontSize={12} />
                                        <YAxis dataKey="owner" type="category" stroke="#9ea4b9" fontSize={11} width={100} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{
                                                background: '#1a1d24',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#f5f6fa',
                                            }}
                                            labelStyle={{ color: '#f5f6fa' }}
                                            itemStyle={{ color: '#f5f6fa' }}
                                        />
                                        <Bar dataKey="leads" fill="#6be585" radius={[0, 4, 4, 0]} maxBarSize={25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No Data Available for this Range</div>
                    )}
                </ChartCard>

                {/* Lead Behavior Clusters - Converted to Horizontal Bar */}
                <ChartCard eyebrow="Behavior Segmentation" title="Lead Clusters by Engagement" colSpan={1}>
                    {clusters.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={clusters} layout="vertical" barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="#9ea4b9" fontSize={12} />
                                <YAxis dataKey="label" type="category" stroke="#9ea4b9" fontSize={11} width={140} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                    labelStyle={{ color: '#f5f6fa' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]} maxBarSize={40}>
                                    {clusters.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || CLUSTER_COLORS[entry.label]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No Data Available for this Range</div>
                    )}
                </ChartCard>

                {/* Fastest Closing Segments */}
                <ChartCard eyebrow="Efficiency Analysis" title="Fastest Closing Segments (Days)" colSpan={1}>
                    {fastestSegments.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fastestSegments.slice(0, 8)} layout="vertical" barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="#9ea4b9" fontSize={12} />
                                <YAxis dataKey="segment" type="category" stroke="#9ea4b9" fontSize={11} width={140} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                    labelStyle={{ color: '#f5f6fa' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Bar dataKey="avg_close_time" fill="#6be585" radius={[0, 4, 4, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No Data Available for this Range</div>
                    )}
                </ChartCard>

                {/* Employee Conversion Performance */}
                <ChartCard eyebrow="Team Performance" title="Top Employees (Conversion %)" colSpan={1}>
                    {employeeConversion.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={employeeConversion.slice(0, 10)} barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="owner" stroke="#9ea4b9" fontSize={11} angle={-45} textAnchor="end" height={60} />
                                <YAxis stroke="#9ea4b9" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                    labelStyle={{ color: '#f5f6fa' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Bar dataKey="conversion" fill="#7fd3ff" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No Data Available for this Range</div>
                    )}
                </ChartCard>

                {/* Loss Reasons */}
                <ChartCard eyebrow="Loss Analysis" title="Top Reasons for Lost Leads" colSpan={1}>
                    {lossReasons.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lossReasons.slice(0, 8)} layout="vertical" barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="#9ea4b9" fontSize={12} />
                                <YAxis dataKey="label" type="category" stroke="#9ea4b9" fontSize={11} width={140} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1d24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f5f6fa',
                                    }}
                                    labelStyle={{ color: '#f5f6fa' }}
                                    itemStyle={{ color: '#f5f6fa' }}
                                />
                                <Bar dataKey="value" fill="#ff6584" radius={[0, 4, 4, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No Data Available for this Range</div>
                    )}
                </ChartCard>
            </div>
        </section>
    )
}

export default InsightsView
