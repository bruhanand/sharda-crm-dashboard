import React, { useMemo, useState } from 'react'
import { buildFilterOptions } from '../lib/analytics'
import { getFYDates } from '../utils/filterUtils'
import FYToggle from './FYToggle'
import logoImage from '../assets/logo.jpg'
import './FilterBar.css'

const dateRangeModes = [
    { label: 'Enquiry Date', value: 'enquiry' },
    { label: 'Close Date', value: 'close' },
]

const filterFieldConfig = [
    { label: 'City', stateKey: 'city', optionKey: 'city' },
    { label: 'Dealer', stateKey: 'dealer', optionKey: 'dealer' },
    { label: 'Employee', stateKey: 'owner', optionKey: 'owner' },
    { label: 'Segment', stateKey: 'segment', optionKey: 'segment' },
    { label: 'KVA Range', stateKey: 'kvaRange', optionKey: 'kva_range' },
]

export default function FilterBar({
    filters,
    setFilters,
    dateDraft,
    setDateDraft,
    applyDateFilters,
    clearFilters,
    leads,
}) {
    const optionMap = useMemo(() => buildFilterOptions(leads), [leads])
    const [selectedFY, setSelectedFY] = useState('custom')

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }))
    }

    const handleDateDraftChange = (field, value) => {
        setDateDraft((prev) => ({ ...prev, [field]: value }))
    }

    const handleFYChange = (fyType) => {
        setSelectedFY(fyType)
        const dates = getFYDates(fyType)
        setDateDraft({
            start: dates.startDate,
            end: dates.endDate
        })
    }

    return (
        <aside className="filter-panel">
            <div className="brand">
                <img src={logoImage} alt="Company Logo" className="logo-image" />
                <p>Lead Management Studio</p>
            </div>
            <div className="filter-scroll">
                <section className="filter-card">
                    <header className="filter-card__header">
                        <div>
                            <p className="eyebrow">Filter</p>
                            <h2>Data Scope</h2>
                        </div>
                        <button className="text-button" onClick={clearFilters}>
                            Clear all
                        </button>
                    </header>
                    <div className="filter-card__body">
                        {filterFieldConfig.map((field) => (
                            <label className="filter-field" key={field.stateKey}>
                                <span>{field.label}</span>
                                <select
                                    value={filters[field.stateKey]}
                                    onChange={(e) => handleFilterChange(field.stateKey, e.target.value)}
                                >
                                    <option value="all">All {field.label}</option>
                                    {(optionMap[field.optionKey] || []).map((optionValue) => {
                                        const label = optionValue || 'Not specified'
                                        return (
                                            <option key={optionValue} value={optionValue}>
                                                {label}
                                            </option>
                                        )
                                    })}
                                </select>
                            </label>
                        ))}
                    </div>
                </section>

                <section className="date-filter-card">
                    <header className="date-filter-card__header">
                        <div>
                            <p className="eyebrow">Date Filter</p>
                        </div>
                    </header>
                    <FYToggle selectedFY={selectedFY} onFYChange={handleFYChange} />
                    <div className="toggle-row compact">
                        {dateRangeModes.map((mode) => (
                            <button
                                key={mode.value}
                                type="button"
                                className={`toggle-pill ${filters.dateRangeType === mode.value ? 'active' : ''}`}
                                onClick={() => handleFilterChange('dateRangeType', mode.value)}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    <div className="date-grid">
                        <label>
                            <span>Start</span>
                            <input
                                type="date"
                                value={dateDraft.start}
                                onChange={(e) => handleDateDraftChange('start', e.target.value)}
                            />
                        </label>
                        <label>
                            <span>End</span>
                            <input
                                type="date"
                                value={dateDraft.end}
                                onChange={(e) => handleDateDraftChange('end', e.target.value)}
                            />
                        </label>
                    </div>
                    <button type="button" className="primary-btn apply-btn" onClick={applyDateFilters}>
                        Apply Dates
                    </button>
                </section>
            </div>
        </aside>
    )
}
