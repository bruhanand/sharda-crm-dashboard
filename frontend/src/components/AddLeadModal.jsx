import React, { useState, useEffect } from 'react'
import SmartCombobox from './SmartCombobox'
import { leadService } from '../services/leadService'
import './AddLeadModal.css'

const AddLeadModal = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState('form') // 'form', 'validating', 'checking', 'saving', 'success', 'error'
    const [progress, setProgress] = useState(0)
    const [mode, setMode] = useState('add') // 'add' or 'update'
    const [existingLeadId, setExistingLeadId] = useState(null)
    const [error, setError] = useState('')
    const [fieldOptions, setFieldOptions] = useState({})
    const [loadingOptions, setLoadingOptions] = useState(true)

    const [formData, setFormData] = useState({
        // Basic Information
        enquiry_id: '',
        enquiry_date: '',
        close_date: '',
        lead_status: 'Open',
        lead_stage: '',
        enquiry_type: '',

        // Company & Contact
        dealer: '',
        corporate_name: '',
        customer_type: '',
        email: '',
        phone_number: '',
        pan_number: '',

        // Location
        address: '',
        state: '',
        city: '',
        district: '',
        tehsil: '',
        zone: '',
        pincode: '',
        area_office: '',
        branch: '',
        location: '',

        // Product Details
        segment: '',
        sub_segment: '',
        kva: '',
        kva_range: '',
        quantity: 1,
        order_value: 0,
        dg_ownership: '',

        // Source & Ownership
        source: '',
        source_from: '',
        events: '',
        owner: '',
        owner_code: '',
        owner_status: '',
        referred_by: '',

        // Finance
        finance_required: false,
        finance_company: '',

        // Follow-up
        followup_count: 0,
        last_followup_date: '',
        next_followup_date: '',

        // Additional
        phase: '',
        win_flag: false,
        loss_reason: '',
        remarks: '',
    })

    // Load field options on mount
    useEffect(() => {
        if (isOpen) {
            loadFieldOptions()
        }
    }, [isOpen])

    const loadFieldOptions = async () => {
        try {
            setLoadingOptions(true)
            const options = await leadService.getAllFieldOptions()
            setFieldOptions(options)
        } catch (err) {
            console.error('Failed to load field options:', err)
        } finally {
            setLoadingOptions(false)
        }
    }

    // Check for duplicate when enquiry_id changes
    const handleEnquiryIdBlur = async () => {
        const enquiryId = formData.enquiry_id.trim()

        if (!enquiryId || enquiryId.length < 2) {
            setMode('add')
            setExistingLeadId(null)
            return
        }

        try {
            const response = await leadService.searchLeads(enquiryId)
            const exactMatch = response.results?.find(
                lead => lead.enquiry_id === enquiryId
            )

            if (exactMatch) {
                // Found existing lead - switch to update mode
                setMode('update')
                setExistingLeadId(exactMatch.id)

                // Fetch full lead data
                const fullLead = await leadService.getLead(exactMatch.id)
                setFormData({
                    ...fullLead,
                    enquiry_date: fullLead.enquiry_date || '',
                    close_date: fullLead.close_date || '',
                    last_followup_date: fullLead.last_followup_date || '',
                    next_followup_date: fullLead.next_followup_date || '',
                })
            } else {
                setMode('add')
                setExistingLeadId(null)
            }
        } catch (err) {
            console.error('Error checking for duplicate:', err)
        }
    }

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError('')
    }

    const simulateProgress = (callback, duration = 1500) => {
        setProgress(0)
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval)
                    return 90
                }
                return prev + 10
            })
        }, duration / 10)

        return interval
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Step 1: Validation
        setStep('validating')
        const validationInterval = simulateProgress(() => { }, 500)

        await new Promise(resolve => setTimeout(resolve, 500))
        clearInterval(validationInterval)

        if (!formData.enquiry_id || !formData.dealer) {
            setProgress(100)
            setError('Enquiry ID and Dealer are required')
            setStep('error')
            return
        }

        // Step 2: Checking for duplicates (only in add mode)
        if (mode === 'add') {
            setStep('checking')
            setProgress(0)
            const checkInterval = simulateProgress(() => { }, 800)

            try {
                await new Promise(resolve => setTimeout(resolve, 800))
                const response = await leadService.searchLeads(formData.enquiry_id)
                const exactMatch = response.results?.find(
                    lead => lead.enquiry_id === formData.enquiry_id
                )

                clearInterval(checkInterval)
                setProgress(100)

                if (exactMatch && !existingLeadId) {
                    setError(`Lead with Enquiry ID "${formData.enquiry_id}" already exists. Please use a different ID or update the existing lead.`)
                    setStep('error')
                    return
                }
            } catch (err) {
                clearInterval(checkInterval)
                console.error('Error checking duplicate:', err)
            }
        }

        // Step 3: Saving
        setStep('saving')
        setProgress(0)
        const savingInterval = simulateProgress(() => { }, 1200)

        try {
            let savedLead
            if (mode === 'update' && existingLeadId) {
                savedLead = await leadService.updateLead(existingLeadId, formData)
            } else {
                savedLead = await leadService.createLead(formData)
            }

            clearInterval(savingInterval)
            setProgress(100)

            // Step 4: Success
            await new Promise(resolve => setTimeout(resolve, 300))
            setStep('success')

            setTimeout(() => {
                onSuccess(savedLead)
                resetForm()
            }, 2000)

        } catch (err) {
            clearInterval(savingInterval)
            setError(err.message || `Failed to ${mode} lead`)
            setStep('error')
        }
    }

    const resetForm = () => {
        setFormData({
            enquiry_id: '', enquiry_date: '', close_date: '', lead_status: 'Open',
            lead_stage: '', enquiry_type: '', dealer: '', corporate_name: '',
            customer_type: '', email: '', phone_number: '', pan_number: '',
            address: '', state: '', city: '', district: '', tehsil: '', zone: '',
            pincode: '', area_office: '', branch: '', location: '', segment: '',
            sub_segment: '', kva: '', kva_range: '', quantity: 1, order_value: 0,
            dg_ownership: '', source: '', source_from: '', events: '', owner: '',
            owner_code: '', owner_status: '', referred_by: '', finance_required: false,
            finance_company: '', followup_count: 0, last_followup_date: '',
            next_followup_date: '', phase: '', win_flag: false, loss_reason: '', remarks: '',
        })
        setMode('add')
        setExistingLeadId(null)
        setStep('form')
        setProgress(0)
        setError('')
    }

    const handleClose = () => {
        if (step !== 'validating' && step !== 'checking' && step !== 'saving') {
            resetForm()
            onClose()
        }
    }

    if (!isOpen) return null

    // Success Screen
    if (step === 'success') {
        return (
            <div className="modal-overlay" onClick={handleClose}>
                <div className="modal-content modal-success" onClick={(e) => e.stopPropagation()}>
                    <div className="success-animation">
                        <div className="success-checkmark">
                            <div className="check-icon">
                                <span className="icon-line line-tip"></span>
                                <span className="icon-line line-long"></span>
                                <div className="icon-circle"></div>
                                <div className="icon-fix"></div>
                            </div>
                        </div>
                        <h3>Lead {mode === 'add' ? 'Created' : 'Updated'} Successfully!</h3>
                        <p className="success-id">{formData.enquiry_id}</p>
                        <p className="success-subtitle">
                            {mode === 'add' ? 'New lead has been added to the system' : 'Lead information has been updated'}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Error Screen
    if (step === 'error') {
        return (
            <div className="modal-overlay" onClick={handleClose}>
                <div className="modal-content modal-error" onClick={(e) => e.stopPropagation()}>
                    <div className="error-animation">
                        <div className="error-icon">✕</div>
                        <h3>Operation Failed</h3>
                        <p className="error-message">{error}</p>
                        <button onClick={() => setStep('form')} className="primary-btn">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Progress Screen
    if (step === 'validating' || step === 'checking' || step === 'saving') {
        const stepMessages = {
            validating: { title: 'Validating Form', subtitle: 'Checking all required fields...' },
            checking: { title: 'Checking for Duplicates', subtitle: 'Searching existing leads...' },
            saving: { title: mode === 'add' ? 'Creating Lead' : 'Updating Lead', subtitle: 'Saving to database...' }
        }

        const currentStep = stepMessages[step]

        return (
            <div className="modal-overlay">
                <div className="modal-content modal-progress" onClick={(e) => e.stopPropagation()}>
                    <div className="progress-animation">
                        <div className="progress-spinner"></div>
                        <h3>{currentStep.title}</h3>
                        <p className="progress-subtitle">{currentStep.subtitle}</p>
                        <div className="progress-bar-container">
                            <div className="progress-bar">
                                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="progress-percentage">{progress}%</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Main Form
    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <p className="eyebrow">Lead Management</p>
                        <h2>
                            {mode === 'update' ? (
                                <>✏️ Update Lead</>
                            ) : (
                                <>➕ Add New Lead</>
                            )}
                        </h2>
                        {mode === 'update' && (
                            <p className="mode-indicator">✓ Existing lead found - Update mode</p>
                        )}
                    </div>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {loadingOptions && (
                        <div className="loading-options">
                            <div className="spinner-small"></div>
                            Loading dropdown options...
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="lead-form">
                        {/* Basic Information */}
                        <div className="form-section">
                            <h3 className="section-title">📋 Basic Information</h3>
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Enquiry ID *</label>
                                    <input
                                        type="text"
                                        value={formData.enquiry_id}
                                        onChange={(e) => handleChange('enquiry_id', e.target.value)}
                                        onBlur={handleEnquiryIdBlur}
                                        required
                                        placeholder="Enter unique enquiry ID..."
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Enquiry Date</label>
                                    <input
                                        type="date"
                                        value={formData.enquiry_date}
                                        onChange={(e) => handleChange('enquiry_date', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Close Date</label>
                                    <input
                                        type="date"
                                        value={formData.close_date}
                                        onChange={(e) => handleChange('close_date', e.target.value)}
                                    />
                                </div>
                                <SmartCombobox
                                    label="Lead Status"
                                    value={formData.lead_status}
                                    onChange={(value) => handleChange('lead_status', value)}
                                    options={fieldOptions.lead_status || ['Open', 'Closed']}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="Lead Stage"
                                    value={formData.lead_stage}
                                    onChange={(value) => handleChange('lead_stage', value)}
                                    options={fieldOptions.lead_stage || []}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="Enquiry Type"
                                    value={formData.enquiry_type}
                                    onChange={(value) => handleChange('enquiry_type', value)}
                                    options={fieldOptions.enquiry_type || []}
                                    allowCustom={true}
                                />
                            </div>
                        </div>

                        {/* Company & Contact */}
                        <div className="form-section">
                            <h3 className="section-title">🏢 Company & Contact</h3>
                            <div className="form-grid">
                                <SmartCombobox
                                    label="Dealer"
                                    value={formData.dealer}
                                    onChange={(value) => handleChange('dealer', value)}
                                    options={fieldOptions.dealer || []}
                                    required={true}
                                    allowCustom={true}
                                />
                                <div className="form-field">
                                    <label>Corporate Name</label>
                                    <input
                                        type="text"
                                        value={formData.corporate_name}
                                        onChange={(e) => handleChange('corporate_name', e.target.value)}
                                    />
                                </div>
                                <SmartCombobox
                                    label="Customer Type"
                                    value={formData.customer_type}
                                    onChange={(value) => handleChange('customer_type', value)}
                                    options={fieldOptions.customer_type || []}
                                    allowCustom={true}
                                />
                                <div className="form-field">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone_number}
                                        onChange={(e) => handleChange('phone_number', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>PAN Number</label>
                                    <input
                                        type="text"
                                        value={formData.pan_number}
                                        onChange={(e) => handleChange('pan_number', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="form-section">
                            <h3 className="section-title">📍 Location</h3>
                            <div className="form-grid">
                                <SmartCombobox
                                    label="State"
                                    value={formData.state}
                                    onChange={(value) => handleChange('state', value)}
                                    options={fieldOptions.state || []}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="City"
                                    value={formData.city}
                                    onChange={(value) => handleChange('city', value)}
                                    options={fieldOptions.city || []}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="District"
                                    value={formData.district}
                                    onChange={(value) => handleChange('district', value)}
                                    options={fieldOptions.district || []}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="Zone"
                                    value={formData.zone}
                                    onChange={(value) => handleChange('zone', value)}
                                    options={fieldOptions.zone || []}
                                    allowCustom={true}
                                />
                                <div className="form-field">
                                    <label>Pincode</label>
                                    <input
                                        type="text"
                                        value={formData.pincode}
                                        onChange={(e) => handleChange('pincode', e.target.value)}
                                    />
                                </div>
                                <SmartCombobox
                                    label="Branch"
                                    value={formData.branch}
                                    onChange={(value) => handleChange('branch', value)}
                                    options={fieldOptions.branch || []}
                                    allowCustom={true}
                                />
                                <div className="form-field full-width">
                                    <label>Address</label>
                                    <textarea
                                        rows="2"
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Product Details */}
                        <div className="form-section">
                            <h3 className="section-title">📦 Product Details</h3>
                            <div className="form-grid">
                                <SmartCombobox
                                    label="Segment"
                                    value={formData.segment}
                                    onChange={(value) => handleChange('segment', value)}
                                    options={fieldOptions.segment || []}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="Sub Segment"
                                    value={formData.sub_segment}
                                    onChange={(value) => handleChange('sub_segment', value)}
                                    options={fieldOptions.sub_segment || []}
                                    allowCustom={true}
                                />
                                <div className="form-field">
                                    <label>KVA</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.kva}
                                        onChange={(e) => handleChange('kva', e.target.value)}
                                    />
                                </div>
                                <SmartCombobox
                                    label="KVA Range"
                                    value={formData.kva_range}
                                    onChange={(value) => handleChange('kva_range', value)}
                                    options={fieldOptions.kva_range || []}
                                    allowCustom={true}
                                />
                                <div className="form-field">
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Order Value</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.order_value}
                                        onChange={(e) => handleChange('order_value', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Info - Collapsible */}
                        <details className="form-section collapsible">
                            <summary>➕ Additional Information (Optional)</summary>
                            <div className="form-grid">
                                <SmartCombobox
                                    label="Source"
                                    value={formData.source}
                                    onChange={(value) => handleChange('source', value)}
                                    options={fieldOptions.source || []}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="Owner"
                                    value={formData.owner}
                                    onChange={(value) => handleChange('owner', value)}
                                    options={fieldOptions.owner || []}
                                    allowCustom={true}
                                />
                                <SmartCombobox
                                    label="Owner Code"
                                    value={formData.owner_code}
                                    onChange={(value) => handleChange('owner_code', value)}
                                    options={fieldOptions.owner_code || []}
                                    allowCustom={true}
                                />
                                <div className="form-field">
                                    <label>Referred By</label>
                                    <input
                                        type="text"
                                        value={formData.referred_by}
                                        onChange={(e) => handleChange('referred_by', e.target.value)}
                                    />
                                </div>
                                <div className="form-field full-width">
                                    <label>Remarks</label>
                                    <textarea
                                        rows="3"
                                        value={formData.remarks}
                                        onChange={(e) => handleChange('remarks', e.target.value)}
                                    />
                                </div>
                            </div>
                        </details>

                        {/* Actions */}
                        <div className="form-actions">
                            <button type="button" onClick={handleClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="primary-btn">
                                {mode === 'add' ? '➕ Add Lead' : '💾 Update Lead'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default AddLeadModal
