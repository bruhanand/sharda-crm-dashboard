import { useEffect, useState, useMemo } from 'react'
import './App.css'
import { apiRequest } from './lib/api'
import Login from './components/Login'
import FilterBar from './components/FilterBar'
import Dashboard from './components/Dashboard'
import { useLeadData } from './hooks/useLeadData'
import { initialFilters } from './utils/filterUtils'

const tabs = ['KPI', 'Charts', 'Insights', 'Update Leads', 'Admin']

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('authToken'))
  const [currentUser, setCurrentUser] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })

  // Filter and navigation state
  const [filters, setFilters] = useState(initialFilters)
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [refreshKey, setRefreshKey] = useState(0)
  const [dateDraft, setDateDraft] = useState({
    start: initialFilters.startDate,
    end: initialFilters.endDate,
  })

  // Lead data from custom hook
  const { leads, setLeads, kpiData, forecastSummary, insightData, isLoading, apiError } = useLeadData(
    filters,
    refreshKey,
    isAuthenticated
  )

  // Upload state
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [selectedNewRows, setSelectedNewRows] = useState({})
  const [uploadMessage, setUploadMessage] = useState(null)

  // Lead management state
  const [leadSearch, setLeadSearch] = useState('')
  const [leadDrawer, setLeadDrawer] = useState({
    open: false,
    lead: null,
    form: {},
    saving: false,
    error: null,
  })
  const [newLeadDialog, setNewLeadDialog] = useState({
    open: false,
    leads: [],
    form: {},
    saving: false,
    error: null,
  })

  // Comment modal state for new leads
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [newLeadComments, setNewLeadComments] = useState({})
  const [pendingNewLeadIds, setPendingNewLeadIds] = useState([])

  // Sync date draft with filters
  useEffect(() => {
    setDateDraft({
      start: filters.startDate,
      end: filters.endDate,
    })
  }, [filters.startDate, filters.endDate])

  // Handle pending new lead IDs
  useEffect(() => {
    if (!pendingNewLeadIds.length) return

    const normalized = pendingNewLeadIds.map((value) => value && value.toString()).filter(Boolean)
    const matches = leads.filter((lead) => {
      const leadId = lead.enquiry_id || lead.EnquiryID || lead.enquiryId
      return leadId && normalized.includes(leadId.toString())
    })

    if (matches.length) {
      const formState = matches.reduce((acc, lead) => {
        const key = lead.id || lead.enquiry_id
        if (!key) return acc
        acc[key] = {
          remarks: lead.remarks || '',
          next_followup_date: lead.next_followup_date || '',
        }
        return acc
      }, {})

      setNewLeadDialog({
        open: true,
        leads: matches,
        form: formState,
        saving: false,
        error: null,
      })
      setPendingNewLeadIds([])
    }
  }, [pendingNewLeadIds, leads])

  // Authentication handlers
  const handleLogin = (token) => {
    console.log('handleLogin called with token:', token ? 'present' : 'missing')
    setIsAuthenticated(true)
    
    // Update current user from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setCurrentUser(user)
        console.log('User data loaded:', user.username)
      } catch (err) {
        console.error('Failed to parse user data:', err)
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  // Filter handlers
  const clearFilters = () => setFilters(initialFilters)

  const applyDateFilters = () => {
    setFilters((prev) => ({
      ...prev,
      startDate: dateDraft.start,
      endDate: dateDraft.end,
    }))
  }

  // Upload handlers
  const handleUploadPreview = async () => {
    if (!uploadFile) {
      setUploadMessage('Please select a CSV or Excel file.')
      return
    }

    const formData = new FormData()
    formData.append('file', uploadFile)
    setUploadMessage('Uploading and reconciling leads…')

    try {
      const response = await apiRequest('leads/upload/preview/', {
        method: 'POST',
        body: formData,
      })

      const enriched = {
        ...response,
        new_candidates: (response.new_candidates || []).map((candidate, index) => ({
          ...candidate,
          _rowKey:
            candidate.enquiry_id ||
            candidate.raw?.['Enquiry No'] ||
            candidate.raw?.EnquiryID ||
            `row-${index}`,
        })),
      }

      setUploadPreview(enriched)

      const defaultSelection = {}
      enriched.new_candidates.forEach((candidate) => {
        if (candidate._rowKey) {
          defaultSelection[candidate._rowKey] = true
        }
      })

      setSelectedNewRows(defaultSelection)
      setUploadMessage(`Updated ${response.updated_count} existing leads. Review new entries below.`)
    } catch (error) {
      setUploadMessage(error.message || 'Unable to preview upload.')
    }
  }

  const handleUploadConfirm = () => {
    if (!uploadPreview?.new_candidates?.length) {
      setUploadMessage('No new leads to import.')
      return
    }

    const selectedCandidates = uploadPreview.new_candidates.filter(
      (candidate) => candidate._rowKey && selectedNewRows[candidate._rowKey]
    )

    if (selectedCandidates.length === 0) {
      setUploadMessage('Select at least one new lead to import.')
      return
    }

    // Show comment modal
    setShowCommentModal(true)
  }

  const handleCommentChange = (leadKey, comment) => {
    setNewLeadComments((prev) => ({
      ...prev,
      [leadKey]: comment,
    }))
  }

  const handleConfirmWithComments = async () => {
    // setShowCommentModal(false) - Handled by modal UI after success
    await createLeadsWithComments(newLeadComments)
    setNewLeadComments({})
  }

  const handleSkipComments = async () => {
    // setShowCommentModal(false) - Handled by modal UI after success
    await createLeadsWithComments({})
    setNewLeadComments({})
  }

  const handleCloseCommentModal = () => {
    setShowCommentModal(false)
  }

  const createLeadsWithComments = async (comments) => {
    if (!uploadPreview?.new_candidates?.length) {
      setUploadMessage('No new leads to import.')
      return
    }

    const selectedCandidates = uploadPreview.new_candidates.filter(
      (candidate) => candidate._rowKey && selectedNewRows[candidate._rowKey]
    )

    const rows = selectedCandidates.map((candidate) => {
      const row = { ...candidate.raw }
      const comment = comments[candidate._rowKey]
      if (comment) {
        row.remarks = comment
        row.Remarks = comment
      }
      return row
    })

    if (rows.length === 0) {
      setUploadMessage('Select at least one new lead to import.')
      return
    }

    try {
      await apiRequest('leads/upload/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })

      setUploadMessage(`Created ${rows.length} new lead${rows.length !== 1 ? 's' : ''}.`)

      const createdIds = rows
        .map(
          (row) =>
            row.enquiry_id ||
            row.EnquiryID ||
            row['Enquiry ID'] ||
            row['Enquiry No'] ||
            row.enquiryId ||
            null
        )
        .filter(Boolean)
        .map((value) => value.toString())

      if (createdIds.length) {
        setPendingNewLeadIds(createdIds)
      }

      setUploadPreview(null)
      setSelectedNewRows({})
      setUploadFile(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setUploadMessage(error.message || 'Unable to create new leads.')
      throw error // Re-throw to let modal know it failed
    }
  }

  // Lead update handlers
  const handleUpdateLead = async (leadId, updates) => {
    try {
      await apiRequest(`leads/${leadId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      setRefreshKey((key) => key + 1)
      return true
    } catch (error) {
      console.error('Failed to update lead:', error)
      return false
    }
  }

  const handleBulkUpdateNewLeads = async (updates) => {
    try {
      await Promise.all(
        Object.entries(updates).map(([leadId, data]) =>
          apiRequest(`leads/${leadId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
        )
      )
      setRefreshKey((key) => key + 1)
      return true
    } catch (error) {
      console.error('Failed to bulk update leads:', error)
      return false
    }
  }

  const refreshData = () => {
    setRefreshKey((key) => key + 1)
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">CRM Analytics</h1>
          <div className="header-actions">
            <span className="user-info">
              {currentUser?.username || 'User'}
            </span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Filters Left, Content Right */}
      <div className="app-main">
        {/* Left Sidebar - Filters */}
        <aside className="filter-sidebar">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            dateDraft={dateDraft}
            setDateDraft={setDateDraft}
            applyDateFilters={applyDateFilters}
            clearFilters={clearFilters}
            leads={leads}
          />
        </aside>

        {/* Right Content Area */}
        <main className="content-panel">
          {apiError && <div className="status-banner error">{apiError}</div>}
          {isLoading && <div className="status-banner info">Refreshing data…</div>}

          {/* Tab Navigation */}
          <nav className="tab-nav">
            {tabs
              .filter((tab) => tab !== 'Admin' || (currentUser && currentUser.is_admin))
              .map((tab) => (
                <button
                  key={tab}
                  className={`tab-button ${tab === activeTab ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
          </nav>

          {/* Dashboard Content */}
          <Dashboard
            activeTab={activeTab}
            filters={filters}
            leads={leads}
            kpiData={kpiData}
            forecastSummary={forecastSummary}
            insightData={insightData}
            leadSearch={leadSearch}
            setLeadSearch={setLeadSearch}
            leadDrawer={leadDrawer}
            setLeadDrawer={setLeadDrawer}
            newLeadDialog={newLeadDialog}
            setNewLeadDialog={setNewLeadDialog}
            uploadFile={uploadFile}
            setUploadFile={setUploadFile}
            uploadPreview={uploadPreview}
            setUploadPreview={setUploadPreview}
            selectedNewRows={selectedNewRows}
            setSelectedNewRows={setSelectedNewRows}
            uploadMessage={uploadMessage}
            setUploadMessage={setUploadMessage}
            showCommentModal={showCommentModal}
            setShowCommentModal={setShowCommentModal}
            newLeadComments={newLeadComments}
            setNewLeadComments={setNewLeadComments}
            setPendingNewLeadIds={setPendingNewLeadIds}
            handleUploadPreview={handleUploadPreview}
            handleUploadConfirm={handleUploadConfirm}
            handleConfirmWithComments={handleConfirmWithComments}
            handleSkipComments={handleSkipComments}
            handleUpdateLead={handleUpdateLead}
            handleBulkUpdateNewLeads={handleBulkUpdateNewLeads}
            refreshData={refreshData}
            onCloseCommentModal={handleCloseCommentModal}
          />
        </main>
      </div>
    </div>
  )
}

export default App
