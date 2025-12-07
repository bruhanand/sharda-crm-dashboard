import React, { useMemo, useState, useEffect } from 'react'
import { buildFilterOptions } from '../lib/analytics'
import { generateFYOptions, getCurrentFY, getFYDatesFromValue } from '../utils/filterUtils'
import FYDropdown from './FYDropdown'
import logoImage from '../assets/logo.jpg'
import './FilterBar.css'

// Removed date range modes - always use enquiry date

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
    const fyOptions = useMemo(() => generateFYOptions(), [])
    const [selectedFY, setSelectedFY] = useState(() => getCurrentFY())

    // Initialize with current FY on mount
    useEffect(() => {
        const currentFY = getCurrentFY()
        const dates = getFYDatesFromValue(currentFY)
        setDateDraft({ start: dates.startDate, end: dates.endDate })
        setFilters(prev => ({
            ...prev,
            startDate: dates.startDate,
            endDate: dates.endDate,
            dateRangeType: 'enquiry' // Always enquiry date
        }))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }))
    }

    const handleDateDraftChange = (field, value) => {
        // When user manually changes dates, switch to custom
        setSelectedFY('custom')
        setDateDraft((prev) => ({ ...prev, [field]: value }))
    }

    const handleFYChange = (fyValue) => {
        setSelectedFY(fyValue)
        const dates = getFYDatesFromValue(fyValue)

        // Update date inputs
        setDateDraft({
            start: dates.startDate,
            end: dates.endDate
        })

        // AUTO-APPLY: Update filters immediately
        setFilters(prev => ({
            ...prev,
            startDate: dates.startDate,
            endDate: dates.endDate,
            dateRangeType: 'enquiry'
        }))
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

                {/* NEW: Separate FY Section */}
                <section className="fy-filter-card">
                    <header className="fy-filter-card__header">
                        <div>
                            <p className="eyebrow">Financial Year</p>
                        </div>
                    </header>
                    <div className="fy-filter-card__body">
                        <FYDropdown
                            selectedFY={selectedFY}
                            onFYChange={handleFYChange}
                            fyOptions={fyOptions}
                        />
                    </div>
                </section>

                {/* Date Filter Section - Enquiry Date Only */}
                <section className="date-filter-card">
                    <header className="date-filter-card__header">
                        <div>
                            <p className="eyebrow">Date Filter</p>
                            <p className="date-type-label">Enquiry Date</p>
                        </div>
                    </header>
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
