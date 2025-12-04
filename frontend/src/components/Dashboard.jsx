import { useMemo } from 'react'
import KpiCards from './KpiCards'
import ChartsView from './ChartsView'
import TablesView from './TablesView'
import InsightsView from './InsightsView'
import UploadView from './UploadView'
import AdminView from './AdminView'
import LeadTable from './LeadTable'
import { buildChartsVisuals, buildTopEntities } from '../lib/analytics'

/**
 * Dashboard Component - Main content area with tabs
 * Handles tab navigation and renders appropriate content
 */
const Dashboard = ({
    activeTab,
    filters,
    leads,
    kpiData,
    forecastSummary,
    insightData,
    leadSearch,
    setLeadSearch,
    leadDrawer,
    setLeadDrawer,
    newLeadDialog,
    setNewLeadDialog,
    uploadFile,
    setUploadFile,
    uploadPreview,
    setUploadPreview,
    selectedNewRows,
    setSelectedNewRows,
    uploadMessage,
    setUploadMessage,
    showCommentModal,
    setShowCommentModal,
    newLeadComments,
    setNewLeadComments,
    setPendingNewLeadIds,
    handleUploadPreview,
    handleUploadConfirm,
    handleConfirmWithComments,
    handleSkipComments,
    handleUpdateLead,
    handleBulkUpdateNewLeads,
    refreshData,
    onCloseCommentModal,
}) => {
    const chartVisuals = useMemo(() => buildChartsVisuals(leads), [leads])
    const topDealers = useMemo(() => buildTopEntities(leads, 'dealer'), [leads])
    const topEmployees = useMemo(() => buildTopEntities(leads, 'owner'), [leads])

    const renderTabContent = () => {
        switch (activeTab) {
            case 'KPI':
                return (
                    <div className="kpi-tab-container">
                        <KpiCards kpiData={kpiData} />
                        <section className="table-panel">
                            <header>
                                <div>
                                    <p className="eyebrow">Sales Pipeline</p>
                                    <h2>Enquiries</h2>
                                </div>
                            </header>
                            <div className="table-wrapper-scroll">
                                <LeadTable leads={leads} />
                            </div>
                        </section>
                    </div>
                )

            case 'Charts':
                return <ChartsView filters={filters} chartVisuals={chartVisuals} />

            case 'Insights':
                return (
                    <InsightsView
                        insightData={insightData}
                        forecastSummary={forecastSummary}
                        topDealers={topDealers}
                        topEmployees={topEmployees}
                    />
                )

            case 'Update Leads':
                return (
                    <UploadView
                        filters={filters}
                        uploadFile={uploadFile}
                        setUploadFile={setUploadFile}
                        uploadPreview={uploadPreview}
                        setUploadPreview={setUploadPreview}
                        selectedNewRows={selectedNewRows}
                        toggleNewLeadSelection={(key) => setSelectedNewRows(prev => {
                            const next = { ...prev }
                            if (next[key]) delete next[key]
                            else next[key] = true
                            return next
                        })}
                        uploadMessage={uploadMessage}
                        handleUploadPreview={handleUploadPreview}
                        handleCreateNewLeads={handleUploadConfirm}

                        showCommentModal={showCommentModal}
                        newLeadComments={newLeadComments}
                        handleCommentChange={(key, value) => setNewLeadComments(prev => ({ ...prev, [key]: value }))}
                        handleConfirmWithComments={handleConfirmWithComments}
                        handleSkipComments={handleSkipComments}
                        onCloseCommentModal={onCloseCommentModal}
                        selectedLeadsForComment={uploadPreview?.new_candidates || []}

                        leadTableData={leads}
                        leadSearch={leadSearch}
                        setLeadSearch={setLeadSearch}
                        todaysFollowups={leads.filter(l => l.next_followup_date && l.next_followup_date.startsWith(new Date().toISOString().split('T')[0])).length}

                        leadDrawer={leadDrawer}
                        closeLeadDrawer={() => setLeadDrawer(prev => ({ ...prev, open: false }))}
                        handleDrawerChange={(field, value) => setLeadDrawer(prev => ({ ...prev, form: { ...prev.form, [field]: value } }))}
                        handleLeadSave={handleUpdateLead}
                        handleLeadRowClick={(lead) => setLeadDrawer({ open: true, lead, form: { ...lead } })}

                        newLeadDialog={newLeadDialog}
                        closeNewLeadDialog={() => setNewLeadDialog(prev => ({ ...prev, open: false }))}
                        handleNewLeadFieldChange={(id, field, value) => setNewLeadDialog(prev => ({
                            ...prev,
                            form: { ...prev.form, [id]: { ...prev.form[id], [field]: value } }
                        }))}
                        handleNewLeadInfoSave={handleBulkUpdateNewLeads}
                    />
                )

            case 'Admin':
                return <AdminView refreshData={refreshData} />

            default:
                return null
        }
    }

    return <div className="tab-content">{renderTabContent()}</div>
}

export default Dashboard
