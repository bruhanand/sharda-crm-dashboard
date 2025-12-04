"""
React performance optimization examples using memo and code splitting.
"""
import { memo, lazy, Suspense } from 'react'
import PropTypes from 'prop-types'

// ===== React.memo() for component memoization =====

/**
 * KPI Card component with memoization
 * Only re-renders when props change
 */
const KPICard = memo(({ title, value, trend, icon }) => {
    return (
        <div className="kpi-card">
            <div className="kpi-icon">{icon}</div>
            <div className="kpi-content">
                <h3>{title}</h3>
                <div className="kpi-value">{value}</div>
                {trend && <div className="kpi-trend">{trend}</div>}
            </div>
        </div>
    )
})

KPICard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    trend: PropTypes.string,
    icon: PropTypes.node,
}

KPICard.displayName = 'KPICard'

/**
 * Lead Row component with memoization
 * Prevents unnecessary re-renders in large lists
 */
const LeadRow = memo(({ lead, onUpdate, onSelect }) => {
    return (
        <tr onClick={() => onSelect(lead.id)}>
            <td>{lead.enquiry_id}</td>
            <td>{lead.dealer}</td>
            <td>{lead.lead_status}</td>
            <td>{lead.order_value}</td>
            <td>
                <button onClick={(e) => { e.stopPropagation(); onUpdate(lead.id) }}>
                    Edit
                </button>
            </td>
        </tr>
    )
}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
        prevProps.lead.id === nextProps.lead.id &&
        prevProps.lead.lead_status === nextProps.lead.lead_status &&
        prevProps.lead.order_value === nextProps.lead.order_value
    )
})

LeadRow.propTypes = {
    lead: PropTypes.shape({
        id: PropTypes.number.isRequired,
        enquiry_id: PropTypes.string.isRequired,
        dealer: PropTypes.string,
        lead_status: PropTypes.string,
        order_value: PropTypes.number,
    }).isRequired,
    onUpdate: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
}

LeadRow.displayName = 'LeadRow'

// ===== Code Splitting with React.lazy() =====

/**
 * Lazy load heavy components
 * Reduces initial bundle size
 */

// Load dashboard only when needed
const Dashboard = lazy(() => import('./components/Dashboard'))

// Load charts only when viewing analytics
const ChartsView = lazy(() => import('./components/ChartsView'))

// Load upload modal only when opening upload
const UploadModal = lazy(() => import('./components/UploadModal'))

// Load settings only when accessed
const Settings = lazy(() => import('./components/Settings'))

/**
 * App with code splitting
 */
const App = () => {
    return (
        <div className="app">
            <Suspense fallback={<LoadingSpinner />}>
                {/* Components load on demand */}
                <Dashboard />
            </Suspense>
        </div>
    )
}

const LoadingSpinner = () => (
    <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
    </div>
)

// ===== useMemo for expensive calculations =====

import { useMemo } from 'react'

/**
 * Hook with memoized calculations
 */
const useLeadStats = (leads) => {
    const stats = useMemo(() => {
        // Expensive calculation - only runs when leads change
        return {
            total: leads.length,
            open: leads.filter(l => l.lead_status === 'Open').length,
            totalValue: leads.reduce((sum, l) => sum + (l.order_value || 0), 0),
            avgValue: leads.length > 0
                ? leads.reduce((sum, l) => sum + (l.order_value || 0), 0) / leads.length
                : 0
        }
    }, [leads])  // Only recalculate when leads array changes

    return stats
}

/**
 * useMemo for filtered data
 */
const useFilteredLeads = (leads, filters) => {
    return useMemo(() => {
        let filtered = leads

        if (filters.status) {
            filtered = filtered.filter(l => l.lead_status === filters.status)
        }

        if (filters.dealer) {
            filtered = filtered.filter(l =>
                l.dealer?.toLowerCase().includes(filters.dealer.toLowerCase())
            )
        }

        if (filters.startDate) {
            filtered = filtered.filter(l =>
                new Date(l.enquiry_date) >= new Date(filters.startDate)
            )
        }

        return filtered
    }, [leads, filters])  // Recalculate only when leads or filters change
}

export { KPICard, LeadRow, Dashboard, ChartsView, UploadModal, Settings, useLeadStats, useFilteredLeads }
