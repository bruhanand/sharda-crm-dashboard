import React from 'react'
import { getFYLabel } from '../utils/filterUtils'
import './FYToggle.css'

/**
 * FY Toggle Component - Quick financial year selection
 * Provides buttons for Previous FY, Current FY, and Custom date range
 */
const FYToggle = ({ selectedFY, onFYChange }) => {
    const fyOptions = [
        { value: 'previous', label: getFYLabel('previous') },
        { value: 'current', label: getFYLabel('current') },
        { value: 'custom', label: 'Custom Range' }
    ]

    return (
        <div className="fy-toggle">
            <label className="fy-toggle__label">Time Window</label>
            <div className="fy-toggle__buttons">
                {fyOptions.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        className={`fy-toggle__btn ${selectedFY === option.value ? 'active' : ''}`}
                        onClick={() => onFYChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default FYToggle
