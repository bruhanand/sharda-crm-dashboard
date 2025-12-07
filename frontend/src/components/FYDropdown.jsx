import React from 'react'
import './FYDropdown.css'

const FYDropdown = ({ selectedFY, onFYChange, fyOptions }) => {
    return (
        <div className="fy-dropdown-container">
            <label className="fy-dropdown-label">Financial Year</label>
            <select
                value={selectedFY}
                onChange={(e) => onFYChange(e.target.value)}
                className="fy-dropdown"
            >
                {fyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default FYDropdown
