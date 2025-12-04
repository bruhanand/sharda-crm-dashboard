import React from 'react'
import { rupeeFormatter } from '../lib/analytics'

const KpiCard = ({ label, value, helper }) => (
    <article className="kpi-card">
        <p className="eyebrow">{label}</p>
        <h3>{value}</h3>
        {helper && <small>{helper}</small>}
    </article>
)

export default function KpiCards({ kpiData }) {
    if (!kpiData) return null
    return (
        <section className="kpi-grid">
            <KpiCard label="Total Leads" value={kpiData.total} />
            <KpiCard label="Open Leads" value={kpiData.openCount} />
            <KpiCard label="Closed Leads" value={kpiData.closedCount} />
            <KpiCard label="Won Leads" value={kpiData.wonCount} />
            <KpiCard label="Conversion %" value={`${kpiData.conversion}%`} />
            <KpiCard
                label="Avg Close Days"
                value={kpiData.avgCloseTime ? `${kpiData.avgCloseTime}` : '—'}
            />
            <KpiCard
                label="Avg Lead Age"
                value={kpiData.avgLeadAge ? `${kpiData.avgLeadAge}` : '—'}
                helper="Open leads"
            />
        </section>
    )
}
