import React from 'react'
import { rupeeFormatter } from '../lib/analytics'

const TopEntityTable = ({ data, entityLabel }) => (
    <section className="top-entity-card">
        <header className="table-header">
            <div>
                <p className="eyebrow">Performance</p>
                <h2>Top {entityLabel}s</h2>
            </div>
        </header>
        <div className="table-scroll">
            <table className="entity-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>{entityLabel}</th>
                        <th>Total Leads</th>
                        <th>Won</th>
                        <th>Conversion</th>
                        <th>Order Value</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={row.label}>
                            <td>#{index + 1}</td>
                            <td className="entity-name">{row.label}</td>
                            <td>{row.total}</td>
                            <td>{row.won}</td>
                            <td>
                                <span
                                    className={`conversion-badge ${row.conversion >= 30 ? 'high' : row.conversion >= 10 ? 'med' : 'low'
                                        }`}
                                >
                                    {row.conversion}%
                                </span>
                            </td>
                            <td>{rupeeFormatter(row.orderValue)}</td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={6}>No data available.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </section>
)

export default function TablesView({ topDealers, topEmployees, activeTab }) {
    if (activeTab === 'Top Dealers') {
        return <TopEntityTable data={topDealers} entityLabel="Dealer" />
    }
    if (activeTab === 'Top Employees') {
        return <TopEntityTable data={topEmployees} entityLabel="Employee" />
    }
    return null
}
