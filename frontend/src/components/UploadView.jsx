import React, { useState, useEffect } from 'react'
import { HIGH_VALUE_THRESHOLD, rupeeFormatter, formatDateTime, formatDate } from '../lib/analytics'
import './UploadView.css'

const filterFieldConfig = [
    { label: 'Status', stateKey: 'leadStatus', optionKey: 'lead_status' },
    { label: 'Stage', stateKey: 'leadStage', optionKey: 'lead_stage' },
    { label: 'Dealer', stateKey: 'dealer', optionKey: 'dealer' },
    { label: 'State', stateKey: 'state', optionKey: 'state' },
    { label: 'City', stateKey: 'city', optionKey: 'city' },
    { label: 'Zone', stateKey: 'zone', optionKey: 'zone' },
    { label: 'Segment', stateKey: 'segment', optionKey: 'segment' },
    { label: 'KVA Range', stateKey: 'kvaRange', optionKey: 'kva_range' },
    { label: 'Owner', stateKey: 'owner', optionKey: 'owner' },
    { label: 'Source', stateKey: 'source', optionKey: 'source' },
    { label: 'FY', stateKey: 'fy', optionKey: 'fy' },
    { label: 'Month', stateKey: 'month', optionKey: 'month' },
]

const summarizeActiveFilters = (filters) => {
    const summary = []

    if (filters.startDate || filters.endDate) {
        summary.push(`Dates Active`)
    }

    if (filters.dateRangeType === 'close') {
        summary.push('Date Mode: Close Date')
    }

    filterFieldConfig.forEach(({ label, stateKey }) => {
        const value = filters[stateKey]
        if (value && value !== 'all') {
            summary.push(`${label}: ${value}`)
        }
    })

    if (filters.highValueOnly) {
        summary.push(`High Value ≥ ${rupeeFormatter(HIGH_VALUE_THRESHOLD)}`)
    }
    if (filters.followupDueOnly) {
        summary.push('Follow-up Due')
    }

    return summary
}

const UploadModal = ({ isOpen, onClose, filters, setUploadFile, onUpload, uploadMessage, followupCount }) => {
    const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, done
    const [progress, setProgress] = useState(0)
    const activeFilters = summarizeActiveFilters(filters)

    useEffect(() => {
        if (!isOpen) {
            setUploadStatus('idle')
            setProgress(0)
        }
    }, [isOpen])

    const handleUploadClick = async () => {
        setUploadStatus('uploading')
        setProgress(0)

        // Simulate progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev
                return prev + 10
            })
        }, 200)

        try {
            await onUpload()
            clearInterval(interval)
            setProgress(100)
            setUploadStatus('done')
        } catch (error) {
            clearInterval(interval)
            setUploadStatus('idle')
            // Error is handled by parent setting uploadMessage
        }
    }

    if (!isOpen) return null

    return (
        <div className="upload-modal-overlay" onClick={uploadStatus === 'done' ? onClose : undefined}>
            <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="upload-modal-header">
                    <div>
                        <p className="eyebrow">Add Enquiry</p>
                        <h2>Upload New Leads</h2>
                    </div>
                    {uploadStatus !== 'uploading' && (
                        <button className="upload-modal-close" onClick={onClose}>×</button>
                    )}
                </div>
                <div className="upload-modal-body">
                    {uploadStatus === 'done' ? (
                        <div className="center-text">
                            <span className="success-icon">✓</span>
                            <h3>Upload & Reconciliation Complete</h3>
                            <p className="upload-message">{uploadMessage}</p>
                            <button className="primary-btn" style={{ marginTop: '24px' }} onClick={onClose}>
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span className="followup-chip">Today's Follow-up Count: {followupCount}</span>
                            </div>
                            <p className="upload-panel__subtext">
                                This upload automatically respects the filters on the left. Adjust the global filters there before
                                reconciling spreadsheets.
                            </p>
                            <div className="active-filter-list">
                                {activeFilters.length ? (
                                    activeFilters.map((label) => (
                                        <span key={label} className="filter-pill">
                                            {label}
                                        </span>
                                    ))
                                ) : (
                                    <span className="filter-pill muted">No filters applied (all leads)</span>
                                )}
                            </div>

                            <div className="upload-actions">
                                <div className="file-upload-row">
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        disabled={uploadStatus === 'uploading'}
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    />
                                    <button
                                        type="button"
                                        className="primary-btn"
                                        onClick={handleUploadClick}
                                        disabled={uploadStatus === 'uploading'}
                                    >
                                        {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload & Reconcile'}
                                    </button>
                                </div>
                                <small className="upload-hint">Accepted formats: CSV, XLSX</small>

                                {uploadStatus === 'uploading' && (
                                    <div className="progress-container">
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <p className="progress-text">Uploading and reconciling leads...</p>
                                    </div>
                                )}
                            </div>
                            {uploadMessage && uploadStatus !== 'uploading' && <p className="upload-message">{uploadMessage}</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

const UploadPreviewSection = ({ preview, selectedRows, toggleSelection, onCreate, onClose }) => {
    const updatedCount = preview.updated_count || 0
    const newCount = preview.new_candidates ? preview.new_candidates.length : 0
    const totalRecords = preview.total_records || (updatedCount + newCount)
    const noUpdateCount = Math.max(0, totalRecords - updatedCount - newCount - (preview.total_errors || 0))

    return (
        <section className="upload-preview">
            <header className="upload-preview__header">
                <div>
                    <p className="eyebrow">Import Summary</p>
                    <h3>
                        Updated {updatedCount} leads • No update {noUpdateCount} leads • {newCount} new leads detected
                    </h3>
                </div>
                {newCount > 0 ? (
                    <button type="button" className="primary-btn" onClick={onCreate}>
                        Add Selected Leads
                    </button>
                ) : (
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                )}
            </header>
            <div className="table-scroll">
                <table className="new-lead-table">
                    <thead>
                        <tr>
                            <th>Select</th>
                            <th>Enquiry ID</th>
                            <th>Dealer</th>
                            <th>Segment</th>
                            <th>State</th>
                            <th>Customer Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.new_candidates.map((candidate) => (
                            <tr key={candidate._rowKey}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={!!selectedRows[candidate._rowKey]}
                                        onChange={() => toggleSelection(candidate._rowKey)}
                                    />
                                </td>
                                <td>{candidate.enquiry_id || candidate.raw?.['Enquiry No'] || '—'}</td>
                                <td>{candidate.dealer || candidate.raw?.Dealer || '—'}</td>
                                <td>{candidate.segment || candidate.raw?.Segment || '—'}</td>
                                <td>{candidate.state || candidate.raw?.State || '—'}</td>
                                <td>{candidate.customer_type || candidate.raw?.['Customer Type'] || '—'}</td>
                            </tr>
                        ))}
                        {preview.new_candidates.length === 0 && (
                            <tr>
                                <td colSpan={6}>All rows matched existing leads.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

export const NewLeadCommentModal = ({ isOpen, leads, comments, onCommentChange, onConfirm, onSkip, onClose }) => {
    const [updateStatus, setUpdateStatus] = useState('idle') // idle, updating, done
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (!isOpen) {
            setUpdateStatus('idle')
            setProgress(0)
        }
    }, [isOpen])

    const handleUpdateClick = async () => {
        setUpdateStatus('updating')
        setProgress(0)

        // Simulate progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev
                return prev + 5
            })
        }, 100)

        try {
            await onConfirm()
            clearInterval(interval)
            setProgress(100)
            setUpdateStatus('done')
        } catch (error) {
            clearInterval(interval)
            setUpdateStatus('idle')
            console.error(error)
        }
    }

    const handleSkipClick = async () => {
        setUpdateStatus('updating')
        setProgress(0)

        // Simulate progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev
                return prev + 5
            })
        }, 100)

        try {
            await onSkip()
            clearInterval(interval)
            setProgress(100)
            setUpdateStatus('done')
        } catch (error) {
            clearInterval(interval)
            setUpdateStatus('idle')
            console.error(error)
        }
    }

    if (!isOpen || !leads || leads.length === 0) return null

    return (
        <div className="center-modal-overlay" onClick={updateStatus === 'done' ? onClose : undefined}>
            <div className="center-modal" onClick={(e) => e.stopPropagation()}>
                <header>
                    <div>
                        <p className="eyebrow">Add Comments for New Leads</p>
                        <h2>{leads.length} New Lead{leads.length !== 1 ? 's' : ''} Selected</h2>
                    </div>
                    {updateStatus === 'done' && (
                        <button className="upload-modal-close" onClick={onClose}>×</button>
                    )}
                </header>
                <div className="drawer-body">
                    {updateStatus === 'done' ? (
                        <div className="center-text" style={{ padding: '40px' }}>
                            <span className="success-icon">✓</span>
                            <h3>Leads Added Successfully</h3>
                            <button className="primary-btn" style={{ marginTop: '24px' }} onClick={onClose}>
                                Done
                            </button>
                        </div>
                    ) : updateStatus === 'updating' ? (
                        <div className="center-text" style={{ padding: '40px' }}>
                            <h3>Adding Leads...</h3>
                            <div className="progress-container" style={{ maxWidth: '400px', margin: '24px auto' }}>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="progress-text">{progress}% Complete</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="info-text">
                                You can optionally add a comment for each new lead. Comments will be saved in the Remarks field.
                            </p>
                            <div className="table-scroll">
                                <table className="lead-table">
                                    <thead>
                                        <tr>
                                            <th>Enquiry ID</th>
                                            <th>Dealer</th>
                                            <th>Segment</th>
                                            <th>Comment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leads.map((lead) => (
                                            <tr key={lead._rowKey}>
                                                <td>{lead.enquiry_id || lead.raw?.['Enquiry No'] || '—'}</td>
                                                <td>{lead.dealer || lead.raw?.Dealer || '—'}</td>
                                                <td>{lead.segment || lead.raw?.Segment || '—'}</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        placeholder="Add comment (optional)..."
                                                        value={comments[lead._rowKey] || ''}
                                                        onChange={(e) => onCommentChange(lead._rowKey, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
                {updateStatus === 'idle' && (
                    <footer>
                        <button className="text-button" type="button" onClick={handleSkipClick}>
                            Skip (No Comments)
                        </button>
                        <button className="primary-btn" type="button" onClick={handleUpdateClick}>
                            Update Now
                        </button>
                    </footer>
                )}
            </div>
        </div>
    )
}

export const NewLeadInfoModal = ({ dialog, onClose, onChange, onSave }) => {
    if (!dialog.open) return null

    return (
        <div className="lead-drawer-overlay" onClick={onClose}>
            <div className="lead-drawer wide" onClick={(e) => e.stopPropagation()}>
                <header>
                    <div>
                        <p className="eyebrow">New Leads Created</p>
                        <h3>Add Initial Details</h3>
                    </div>
                    <button className="text-button" type="button" onClick={onClose}>
                        Close
                    </button>
                </header>
                <div className="drawer-body">
                    <p className="info-text">
                        The following leads were just created. You can optionally add remarks and set a follow-up date now.
                    </p>
                    <div className="table-scroll">
                        <table className="lead-table">
                            <thead>
                                <tr>
                                    <th>Enquiry ID</th>
                                    <th>Dealer</th>
                                    <th>Remarks</th>
                                    <th>Next Follow-up</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dialog.leads.map((lead) => {
                                    const formData = dialog.form[lead.id] || {}
                                    return (
                                        <tr key={lead.id}>
                                            <td>{lead.enquiry_id}</td>
                                            <td>{lead.dealer}</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    placeholder="Remarks..."
                                                    value={formData.remarks || ''}
                                                    onChange={(e) => onChange(lead.id, 'remarks', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={formData.next_followup_date || ''}
                                                    onChange={(e) => onChange(lead.id, 'next_followup_date', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {dialog.error && <p className="error-text">{dialog.error}</p>}
                </div>
                <footer>
                    <button className="text-button" type="button" onClick={onClose}>
                        Skip
                    </button>
                    <button className="primary-btn" type="button" disabled={dialog.saving} onClick={onSave}>
                        {dialog.saving ? 'Saving…' : 'Save Details'}
                    </button>
                </footer>
            </div>
        </div>
    )
}

export const LeadDrawer = ({ drawer, onClose, onChange, onSave }) => {
    if (!drawer.open || !drawer.lead) {
        return null
    }
    return (
        <div className="lead-drawer-overlay" onClick={onClose}>
            <div className="lead-drawer" onClick={(e) => e.stopPropagation()}>
                <header>
                    <div>
                        <p className="eyebrow">Edit Lead</p>
                        <h3>{drawer.lead.enquiry_id}</h3>
                    </div>
                    <button className="text-button" type="button" onClick={onClose}>
                        Close
                    </button>
                </header>
                <div className="drawer-body">
                    <label>
                        <span>Status</span>
                        <select value={drawer.form.lead_status} onChange={(e) => onChange('lead_status', e.target.value)}>
                            <option value="">—</option>
                            <option value="Open">Open</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </label>
                    <label>
                        <span>Stage</span>
                        <input value={drawer.form.lead_stage} onChange={(e) => onChange('lead_stage', e.target.value)} />
                    </label>
                    <label>
                        <span>Remarks</span>
                        <textarea
                            rows={4}
                            value={drawer.form.remarks}
                            onChange={(e) => onChange('remarks', e.target.value)}
                        />
                    </label>
                    <label>
                        <span>Follow-up Count</span>
                        <input
                            type="number"
                            min="0"
                            value={drawer.form.followup_count}
                            onChange={(e) => onChange('followup_count', Number(e.target.value))}
                        />
                    </label>
                    {drawer.error && <p className="error-text">{drawer.error}</p>}
                </div>
                <footer>
                    <button className="text-button" type="button" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="primary-btn" type="button" disabled={drawer.saving} onClick={() => onSave(drawer.lead.id, drawer.form)}>
                        {drawer.saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </footer>
            </div>
        </div>
    )
}

export default function UploadView({
    filters,
    uploadFile,
    setUploadFile,
    handleUploadPreview,
    uploadMessage,
    todaysFollowups,
    uploadPreview,
    setUploadPreview,
    selectedNewRows,
    toggleNewLeadSelection,
    handleCreateNewLeads,
    leadTableData,
    leadSearch,
    setLeadSearch,
    handleLeadRowClick,
    newLeadDialog,
    closeNewLeadDialog,
    handleNewLeadFieldChange,
    handleNewLeadInfoSave,
    leadDrawer,
    closeLeadDrawer,
    handleDrawerChange,
    handleLeadSave,
    showCommentModal,
    newLeadComments,
    handleCommentChange,
    handleConfirmWithComments,
    handleSkipComments,
    selectedLeadsForComment,
    onCloseCommentModal,
}) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

    const filteredLeads = React.useMemo(() => {
        if (!leadSearch || !leadSearch.trim()) {
            return leadTableData || []
        }
        const lowerSearch = leadSearch.toLowerCase().trim()
        return (leadTableData || []).filter((lead) => {
            return (
                (lead.enquiry_id && lead.enquiry_id.toLowerCase().includes(lowerSearch)) ||
                (lead.dealer && lead.dealer.toLowerCase().includes(lowerSearch)) ||
                (lead.owner && lead.owner.toLowerCase().includes(lowerSearch)) ||
                (lead.owner_code && lead.owner_code.toLowerCase().includes(lowerSearch)) ||
                (lead.phone_number && lead.phone_number.includes(lowerSearch)) ||
                (lead.email && lead.email.toLowerCase().includes(lowerSearch)) ||
                (lead.corporate_name && lead.corporate_name.toLowerCase().includes(lowerSearch)) ||
                (lead.customer_type && lead.customer_type.toLowerCase().includes(lowerSearch)) ||
                (lead.state && lead.state.toLowerCase().includes(lowerSearch))
            )
        })
    }, [leadTableData, leadSearch])

    return (
        <div className="add-leads-layout">
            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                filters={filters}
                setUploadFile={setUploadFile}
                onUpload={handleUploadPreview}
                uploadMessage={uploadMessage}
                followupCount={todaysFollowups}
            />

            {uploadPreview && (
                <UploadPreviewSection
                    preview={uploadPreview}
                    selectedRows={selectedNewRows}
                    toggleSelection={toggleNewLeadSelection}
                    onCreate={handleCreateNewLeads}
                    onClose={() => setUploadPreview(null)}
                />
            )}

            <section className="lead-table-card">
                <header className="table-header">
                    <div>
                        <p className="eyebrow">Lead Registry</p>
                        <h2>
                            Leads ({filteredLeads.length}
                            {leadTableData?.length === 200 ? '+' : ''})
                        </h2>
                    </div>
                    <div className="lead-table-actions">
                        <div className="search-input-wrapper">
                            <input
                                type="search"
                                className="search-input"
                                placeholder="Search leads..."
                                value={leadSearch}
                                onChange={(e) => setLeadSearch(e.target.value)}
                            />
                        </div>
                        <button className="btn-primary" type="button" onClick={() => setIsUploadModalOpen(true)}>
                            Import Leads
                        </button>
                        <button className="btn-primary" type="button">
                            Export
                        </button>
                    </div>
                </header>
                <div className="table-scroll">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>ID / Enquiry No</th>
                                <th>Dates</th>
                                <th>Customer</th>
                                <th>Dealer Profile</th>
                                <th>Employee</th>
                                <th>Status</th>
                                <th>Stage</th>
                                <th>Contact</th>

                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead, index) => (
                                <tr key={`${lead.enquiry_id}-${index}`} onClick={() => handleLeadRowClick(lead)}>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className="font-mono" style={{ color: '#fff' }}>{lead.id}</span>
                                            <span className="font-mono">{lead.enquiry_id}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', color: '#e4e4e7' }}>{formatDate(lead.enquiry_date)}</span>
                                            <span style={{ fontSize: '11px', color: '#71717a' }}>Upd: {formatDate(lead.updated_at)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500 }}>{lead.corporate_name || lead.customer_type || '—'}</span>
                                            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>{lead.state || '—'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="smart-cell-dealer">
                                            <span className="dealer-name">{lead.dealer || '—'}</span>
                                            <span className="dealer-meta">
                                                {lead.branch ? `${lead.branch} • ` : ''}
                                                {lead.location || ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="smart-cell-employee">
                                            <span>{lead.owner || '—'}</span>
                                            {lead.owner_code && (
                                                <span className="emp-code-badge">{lead.owner_code}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${lead.lead_status === 'Closed' ? 'status-closed' : 'status-open'}`}>
                                            {lead.lead_status || 'Open'}
                                        </span>
                                    </td>
                                    <td>{lead.lead_stage || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                                            <span>{lead.phone_number || '—'}</span>
                                            <span style={{ color: '#71717a' }}>{lead.email || ''}</span>
                                        </div>
                                    </td>

                                </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
                                        {leadSearch ? 'No leads match your search.' : 'No leads match the current filters.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <NewLeadCommentModal
                isOpen={showCommentModal}
                leads={selectedLeadsForComment}
                comments={newLeadComments}
                onCommentChange={handleCommentChange}
                onConfirm={handleConfirmWithComments}
                onSkip={handleSkipComments}
                onClose={onCloseCommentModal}
            />

            <NewLeadInfoModal
                dialog={newLeadDialog}
                onClose={closeNewLeadDialog}
                onChange={handleNewLeadFieldChange}
                onSave={handleNewLeadInfoSave}
            />

            <LeadDrawer
                drawer={leadDrawer}
                onClose={closeLeadDrawer}
                onChange={handleDrawerChange}
                onSave={handleLeadSave}
            />
        </div>
    )
}
