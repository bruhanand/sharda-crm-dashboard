import React from 'react'
import './ChartCard.css'

const ChartCard = ({ title, eyebrow, children, colSpan = 1, rowSpan = 1, headerAction }) => {
    return (
        <div
            className="bento-chart-card"
            style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`
            }}
        >
            <div className="bento-chart-header">
                <div>
                    {eyebrow && <p className="bento-chart-eyebrow">{eyebrow}</p>}
                    <h3 className="bento-chart-title">{title}</h3>
                </div>
                {headerAction && <div className="bento-chart-action">{headerAction}</div>}
            </div>
            <div className="bento-chart-body">
                {children}
            </div>
        </div>
    )
}

export default ChartCard
