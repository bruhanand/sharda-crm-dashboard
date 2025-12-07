/**
 * LeadTable Component - Sales Pipeline Table
 * Displays leads in a tabular format with status badges
 */

import { useState } from 'react'
import './LeadModal.css'

const LeadTable = ({ leads }) => {
    const [selectedLead, setSelectedLead] = useState(null)

    const getAccountStatus = (lead) => (lead.lead_status === 'Closed' ? 'Closed' : 'Pending')
    const getPriorityLabel = (lead) => (lead.is_high_value ? 'High' : 'Standard')
    const getProductionStatus = (lead) => lead.lead_stage || 'Pending'
    const getDispatchStatus = (lead) => {
        if (lead.lead_status === 'Closed') return 'Ready'
        if (lead.next_followup_date) return 'Scheduled'
        return 'Pending'
    }

    const formatDate = (value) => {
        if (!value) return '—'
        const date = new Date(value)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
        })
    }

    const formatCurrency = (value) => {
        if (!value) return '₹0'
        return `₹${Number(value).toLocaleString('en-IN')}`
    }

    const handleLeadClick = (lead, e) => {
        e.preventDefault()
        setSelectedLead(lead)
    }

    const closeModal = () => {
        setSelectedLead(null)
    }

    const getProgressPercentage = (lead) => {
        if (lead.lead_status === 'Closed') return 100
        if (lead.lead_stage?.toLowerCase().includes('negotiation')) return 75
        if (lead.lead_stage?.toLowerCase().includes('proposal')) return 50
        if (lead.lead_stage?.toLowerCase().includes('qualified')) return 25
        return 10
    }

    return (
        <>
            <table className="sales-order-table">
                <thead>
                    <tr>
                        <th>Sales Order</th>
                        <th>Request Date</th>
                        <th>Dealer Name</th>
                        <th>Info.</th>
                        <th>Account Status</th>
                        <th>Quantity</th>
                        <th>Priority</th>
                        <th>City</th>
                        <th>Follow ups</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead) => (
                        <tr key={lead.enquiry_id}>
                            <td>
                                <div className="sales-order-cell">
                                    <a
                                        className="sales-order-link"
                                        href="#"
                                        onClick={(e) => handleLeadClick(lead, e)}
                                    >
                                        {lead.enquiry_id}
                                    </a>
                                    <span className="sales-order-sub">{lead.dealer || 'SDPL'}</span>
                                </div>
                            </td>
                            <td>{formatDate(lead.enquiry_date)}</td>
                            <td>{lead.dealer || '—'}</td>
                            <td>
                                <div className="info-stack" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{lead.segment || 'N/A'}</span>
                                    <span style={{ color: '#9ea4b9', fontSize: '12px' }}>
                                        {lead.kva ? `${lead.kva} kVA` : ''}
                                        {lead.kva && lead.phase ? ' • ' : ''}
                                        {lead.phase ? `${lead.phase} Phase` : ''}
                                    </span>
                                    <span style={{ color: '#7f859c', fontSize: '11px' }}>{lead.source || '—'}</span>
                                </div>
                            </td>
                            <td>
                                <span style={{
                                    background: getAccountStatus(lead) === 'Closed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                    color: getAccountStatus(lead) === 'Closed' ? '#4ade80' : '#facc15',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'inline-block'
                                }}>
                                    {getAccountStatus(lead)}
                                </span>
                            </td>
                            <td>{lead.quantity || 1}</td>
                            <td>
                                <span
                                    style={{
                                        background: getPriorityLabel(lead) === 'High' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        color: getPriorityLabel(lead) === 'High' ? '#f87171' : '#60a5fa',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'inline-block'
                                    }}
                                >
                                    {getPriorityLabel(lead)}
                                </span>
                            </td>
                            <td>
                                <span style={{
                                    color: '#e4e4e7',
                                    fontSize: '13px'
                                }}>
                                    {lead.city || '—'}
                                </span>
                            </td>
                            <td>
                                <span style={{
                                    color: '#e4e4e7',
                                    fontSize: '13px'
                                }}>
                                    {lead.followup_count || 0}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {leads.length === 0 && (
                        <tr>
                            <td colSpan={9}>No leads match the current filters.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Lead Details Modal */}
            {selectedLead && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Lead Details</h2>
                                <p className="modal-subtitle">{selectedLead.enquiry_id}</p>
                            </div>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            {/* Progress Bar */}
                            <div className="progress-section">
                                <h3>Progress</h3>
                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${getProgressPercentage(selectedLead)}%` }}
                                    >
                                        <span className="progress-text">{getProgressPercentage(selectedLead)}%</span>
                                    </div>
                                </div>
                                <p className="progress-label">{selectedLead.lead_stage || 'New Lead'}</p>
                            </div>

                            {/* Lead Details Grid */}
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Enquiry ID</span>
                                    <span className="detail-value">{selectedLead.enquiry_id}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Dealer</span>
                                    <span className="detail-value">{selectedLead.dealer || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Enquiry Date</span>
                                    <span className="detail-value">{formatDate(selectedLead.enquiry_date)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Close Date</span>
                                    <span className="detail-value">{formatDate(selectedLead.close_date)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Status</span>
                                    <span className="detail-value">{selectedLead.lead_status || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Stage</span>
                                    <span className="detail-value">{selectedLead.lead_stage || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Segment</span>
                                    <span className="detail-value">{selectedLead.segment || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">KVA</span>
                                    <span className="detail-value">{selectedLead.kva || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Quantity</span>
                                    <span className="detail-value">{selectedLead.quantity || 1}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Order Value</span>
                                    <span className="detail-value">{formatCurrency(selectedLead.order_value)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Owner</span>
                                    <span className="detail-value">{selectedLead.owner || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">City</span>
                                    <span className="detail-value">{selectedLead.city || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">State</span>
                                    <span className="detail-value">{selectedLead.state || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Phase</span>
                                    <span className="detail-value">{selectedLead.phase || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Next Followup</span>
                                    <span className="detail-value">{formatDate(selectedLead.next_followup_date)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Followup Count</span>
                                    <span className="detail-value">{selectedLead.followup_count || 0}</span>
                                </div>
                            </div>

                            {selectedLead.remarks && (
                                <div className="remarks-section">
                                    <h3>Remarks</h3>
                                    <p>{selectedLead.remarks}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default LeadTable
