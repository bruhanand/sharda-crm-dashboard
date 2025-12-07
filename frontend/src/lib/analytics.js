import { HIGH_VALUE_THRESHOLD } from '../data/mockLeads'
export { HIGH_VALUE_THRESHOLD }

export const rupeeFormatter = (value) => {
  if (value === 0) return '₹0'
  const absValue = Math.abs(value)
  if (absValue >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`
  }
  if (absValue >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`
  }
  return `₹${value.toLocaleString('en-IN')}`
}

export const groupByField = (data, key) => {
  const map = data.reduce((acc, lead) => {
    const label = lead[key] || 'N/A'
    acc[label] = acc[label] ? acc[label] + 1 : 1
    return acc
  }, {})

  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export const buildKpisFromDataset = (dataset = []) => {
  const numericValue = (value) => (value ? Number(value) : 0)
  const total = dataset.length
  const open = dataset.filter((lead) => lead.lead_status === 'Open')
  const closed = dataset.filter((lead) => lead.lead_status === 'Closed')
  const won = dataset.filter((lead) => lead.win_flag)
  const pipelineValue = open.reduce((sum, lead) => sum + numericValue(lead.order_value), 0)
  const wonValue = won.reduce((sum, lead) => sum + numericValue(lead.order_value), 0)
  const avgCloseTime =
    closed.length > 0
      ? Math.round(
        closed.reduce((sum, lead) => sum + (lead.close_time_days || 0), 0) / closed.length,
      )
      : null
  const avgLeadAge =
    open.length > 0
      ? Math.round(open.reduce((sum, lead) => sum + (lead.lead_age_days || 0), 0) / open.length)
      : null

  return {
    total,
    openCount: open.length,
    closedCount: closed.length,
    wonCount: won.length,
    conversion: total > 0 ? ((won.length / total) * 100).toFixed(1) : '0.0',
    pipelineValue,
    wonValue,
    avgCloseTime,
    avgLeadAge,
  }
}

export const buildForecastFromDataset = (dataset = []) => {
  const monthlyGroups = dataset.reduce((acc, lead) => {
    const key = lead.month && lead.fy ? `${lead.month}-${lead.fy}` : 'Unknown'
    if (!acc[key]) {
      acc[key] = { leads: 0, wins: 0 }
    }
    acc[key].leads += 1
    acc[key].wins += lead.win_flag ? 1 : 0
    return acc
  }, {})

  return Object.entries(monthlyGroups).map(([label, data]) => ({
    label,
    leads: data.leads,
    conversion: data.leads > 0 ? ((data.wins / data.leads) * 100).toFixed(0) : '0',
  }))
}

export const buildInsightsFromDataset = (dataset = []) => {
  const today = new Date()

  const highValue = dataset.filter((lead) => lead.is_high_value)

  const overdue = dataset.filter((lead) => {
    if (lead.lead_status !== 'Open' || !lead.next_followup_date) return false
    const d = new Date(lead.next_followup_date)
    return !isNaN(d.getTime()) && d < today
  })

  const lossReasons = groupByField(
    dataset.filter((lead) => lead.lead_stage?.toLowerCase().includes('lost')),
    'loss_reason',
  )

  const segmentTimes = {}
  const clusterMap = {
    fast: { label: 'Fast Closure', color: '#6be585', count: 0, closeTotal: 0, followups: 0 },
    long: { label: 'Long Follow Up Time', color: '#f5aa3c', count: 0, closeTotal: 0, followups: 0 },
    engage: { label: 'High Engage', color: '#7fd3ff', count: 0, closeTotal: 0, followups: 0 },
    passive: { label: 'No Follow-Up', color: '#ff6584', count: 0, closeTotal: 0, followups: 0 },
  }
  const employeeMap = {}

  dataset.forEach((lead) => {
    const closeDays = lead.close_time_days
    const segment = lead.segment || 'Unspecified'
    const followups = Number(lead.followup_count || 0)
    const winFlag = lead.win_flag === 1 || lead.win_flag === true || lead.WinFlag === 1

    if (lead.segment && lead.close_time_days) {
      if (!segmentTimes[segment]) segmentTimes[segment] = []
      segmentTimes[segment].push(closeDays)
    }

    let clusterKey = 'passive'
    if (closeDays && closeDays <= 30) clusterKey = 'fast'
    else if (followups >= 4 && closeDays && closeDays > 45) clusterKey = 'long'
    else if (followups >= 2) clusterKey = 'engage'

    const clusterEntry = clusterMap[clusterKey]
    clusterEntry.count += 1
    if (closeDays) clusterEntry.closeTotal += closeDays
    clusterEntry.followups += followups

    const owner = lead.owner || 'Unassigned'
    if (!employeeMap[owner]) {
      employeeMap[owner] = { owner, total: 0, wins: 0, followups: 0 }
    }
    employeeMap[owner].total += 1
    employeeMap[owner].followups += followups
    if (winFlag) employeeMap[owner].wins += 1
  })

  const fastestSegments = Object.entries(segmentTimes)
    .map(([segment, values]) => ({
      segment,
      avg_close_time: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    }))
    .sort((a, b) => a.avg_close_time - b.avg_close_time)

  const clusters = Object.values(clusterMap)
    .filter((cluster) => cluster.count > 0)
    .map((cluster) => ({
      label: cluster.label,
      value: cluster.count,
      avgClose: cluster.count ? Math.round(cluster.closeTotal / cluster.count) : null,
      avgFollowups: cluster.count ? Number((cluster.followups / cluster.count).toFixed(1)) : 0,
      color: cluster.color,
    }))

  const employeeConversion = Object.values(employeeMap)
    .map((entry) => ({
      owner: entry.owner,
      conversion: entry.total ? Number(((entry.wins / entry.total) * 100).toFixed(1)) : 0,
      leads: entry.total,
      avgFollowups: entry.total ? Number((entry.followups / entry.total).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.conversion - a.conversion)

  const followupVsConversion = employeeConversion
    .filter((entry) => entry.leads >= 2)
    .map((entry) => ({
      owner: entry.owner,
      conversion: entry.conversion,
      followups: entry.avgFollowups,
    }))

  return {
    highValueCount: highValue.length,
    overdueFollowups: overdue.length,
    lossReasons,
    fastestSegments,
    clusters,
    employeeConversion,
    followupVsConversion,
  }
}

export const formatKpisResponse = (payload = {}) => {
  const total = payload.total_leads ?? 0
  const conversionValue = payload.conversion_rate ?? 0
  return {
    total,
    openCount: payload.open_leads ?? 0,
    closedCount: payload.closed_leads ?? 0,
    wonCount: payload.won_leads ?? 0,
    lostCount: payload.lost_leads ?? 0,  // New metric
    conversion: total ? Number(conversionValue).toFixed(1) : '0.0',
    pipelineValue: payload.pipeline_value ?? 0,
    wonValue: payload.won_value ?? 0,
    avgCloseTime: payload.avg_close_days ?? null,
    avgLeadAge: payload.avg_lead_age_days ?? null,
  }
}

export const formatForecastResponse = (payload = []) =>
  Array.isArray(payload)
    ? payload.map((row) => ({
      label: row.label,
      leads: row.leads,
      conversion: row.conversion_pct ?? row.conversion ?? 0,
    }))
    : []

export const buildFilterOptions = (dataset = []) => {
  const uniqueValues = (...fields) => {
    return Array.from(
      new Set(
        dataset
          .map((lead) => {
            for (const field of fields) {
              const value = lead[field]
              if (value !== undefined && value !== null && value !== '') {
                return typeof value === 'string' ? value : String(value)
              }
            }
            return null
          })
          .filter((value) => value !== null && value !== ''),
      ),
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }

  return {
    lead_status: uniqueValues('lead_status', 'LeadStatus'),
    lead_stage: uniqueValues('lead_stage', 'LeadStage'),
    dealer: uniqueValues('dealer', 'Dealer'),
    state: uniqueValues('state', 'State'),
    city: uniqueValues('city', 'City', 'Location'),
    segment: uniqueValues('segment', 'Segment'),
    kva_range: uniqueValues('kva_range', 'KVARange'),
    owner: uniqueValues('owner', 'Owner'),
    source: uniqueValues('source', 'Source'),
    fy: uniqueValues('fy', 'FY'),
    month: uniqueValues('month', 'Month'),
    zone: uniqueValues('zone', 'Zone'),
  }
}

export const buildTopEntities = (dataset = [], key) => {
  const lookup = dataset.reduce((acc, lead) => {
    const label = lead[key] || 'Not specified'
    if (!acc[label]) {
      acc[label] = { label, total: 0, won: 0, orderValue: 0 }
    }
    acc[label].total += 1
    if (lead.lead_stage && /won/i.test(lead.lead_stage)) {
      acc[label].won += 1
    }
    const value = Number(lead.order_value) || 0
    acc[label].orderValue += value
    return acc
  }, {})

  return Object.values(lookup)
    .map((entry) => ({
      ...entry,
      [key]: entry.label, // Add dynamic key (dealer/owner)
      leads: entry.total, // Add 'leads' alias for 'total'
      conversion: entry.total ? Number(((entry.won / entry.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export const getDateRangeLabel = (start, end) => {
  if (!start && !end) return 'All time'
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  if (start) return `From ${formatDate(start)}`
  return `Until ${formatDate(end)}`
}

export const getMonthKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const monthLabel = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export const buildChartsVisuals = (leads = []) => {
  if (!leads || leads.length === 0) {
    return {
      monthlyLeads: [],
      conversionTrend: [],
      statusSummary: [],
      segmentStatus: [],
      segmentDistribution: [],
      segmentCloseDays: [],
      avgCloseDays: null,
    }
  }

  const monthlyMap = new Map()
  const segmentStatus = {}
  const segmentDistribution = {}
  const segmentClose = {}
  let openCount = 0
  let closedCount = 0
  let wonCount = 0
  let totalClose = 0
  let closeEntries = 0

  leads.forEach((lead) => {
    const segment = lead.segment || 'Unspecified'
    segmentDistribution[segment] = (segmentDistribution[segment] || 0) + 1

    const isWon = Boolean(lead.win_flag)
    if (lead.lead_status === 'Open') {
      openCount += 1
    } else {
      closedCount += 1
    }
    if (isWon) {
      wonCount += 1
    }

    if (lead.enquiry_date) {
      const d = new Date(lead.enquiry_date)
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

        if (!monthlyMap.has(key)) {
          monthlyMap.set(key, {
            label: label,
            leads: 0,
            won: 0,
          })
        }
        const entry = monthlyMap.get(key)
        entry.leads += 1
        if (isWon) entry.won += 1
      }
    }

    if (!segmentStatus[segment]) {
      segmentStatus[segment] = { segment, open: 0, closed: 0 }
    }
    if (lead.lead_status === 'Open') {
      segmentStatus[segment].open += 1
    } else {
      segmentStatus[segment].closed += 1
    }

    if (lead.close_time_days) {
      if (!segmentClose[segment]) {
        segmentClose[segment] = { segment, total: 0, count: 0 }
      }
      segmentClose[segment].total += lead.close_time_days
      segmentClose[segment].count += 1
      totalClose += lead.close_time_days
      closeEntries += 1
    }
  })

  const monthlyLeads = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => ({
      label: entry.label,
      leads: entry.leads,
      conversion: entry.leads ? Number(((entry.won / entry.leads) * 100).toFixed(1)) : 0,
    }))

  const segmentStatusArr = Object.values(segmentStatus).sort(
    (a, b) => b.open + b.closed - (a.open + a.closed),
  )

  const segmentDistributionArr = Object.entries(segmentDistribution)
    .map(([segment, value]) => ({ segment, value }))
    .sort((a, b) => b.value - a.value)

  const segmentCloseDays = Object.values(segmentClose)
    .map((entry) => ({
      segment: entry.segment,
      avgCloseDays: Math.round(entry.total / entry.count),
    }))
    .sort((a, b) => b.avgCloseDays - a.avgCloseDays)

  return {
    monthlyLeads,
    conversionTrend: monthlyLeads.map((item) => ({
      label: item.label,
      conversion: item.conversion,
    })),
    statusSummary: [
      { label: 'Open', value: openCount },
      { label: 'Closed', value: closedCount },
      { label: 'Won', value: wonCount },
    ],
    segmentStatus: segmentStatusArr,
    segmentDistribution: segmentDistributionArr,
    segmentCloseDays,
    avgCloseDays: closeEntries ? Math.round(totalClose / closeEntries) : null,
  }
}
