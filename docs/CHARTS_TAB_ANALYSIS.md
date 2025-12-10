# Charts Tab Analysis - Frontend Perspective

## Overview
The Charts tab displays 6 different visualizations of lead data. Currently, charts are built **client-side** from paginated leads data using the `buildChartsVisuals()` function in `frontend/src/lib/analytics.js`. The backend has a `/charts/` endpoint, but it's **not currently being used** by the frontend.

---

## Chart Components

### 1. **Monthly Lead Volume** (Bar Chart)
- **Location**: `ChartsView.jsx` lines 124-148
- **Chart Type**: Bar Chart (Recharts)
- **Data Source**: `chartVisuals.monthlyLeads`
- **Data Structure Expected**:
  ```javascript
  [
    {
      label: "Jan 2024",  // Formatted as "MMM YYYY" (e.g., "Jan 2024")
      leads: 150,          // Number of leads in that month
      conversion: 12.5     // Conversion percentage (optional, not displayed)
    },
    // ... more months
  ]
  ```
- **X-Axis**: `label` (month name)
- **Y-Axis**: Number of leads
- **Bar Data Key**: `leads`
- **Current Implementation**: Built from `enquiry_date` field of leads, grouped by month

---

### 2. **Conversion Rate Trend** (Line Chart)
- **Location**: `ChartsView.jsx` lines 151-182
- **Chart Type**: Line Chart (Recharts)
- **Data Source**: `chartVisuals.conversionTrend`
- **Data Structure Expected**:
  ```javascript
  [
    {
      label: "Jan 2024",   // Month label
      conversion: 12.5     // Conversion rate percentage (0-100)
    },
    // ... more months
  ]
  ```
- **X-Axis**: `label` (month name)
- **Y-Axis**: Conversion percentage
- **Line Data Key**: `conversion`
- **Current Implementation**: Derived from `monthlyLeads`, showing conversion rate per month

---

### 3. **Lead Status** (Pie Chart - Donut)
- **Location**: `ChartsView.jsx` lines 185-238
- **Chart Type**: Pie/Donut Chart (Recharts)
- **Data Source**: `chartVisuals.statusSummary` (processed into `statusData`)
- **Data Structure Expected**:
  ```javascript
  [
    {
      label: "Open",   // Status label
      value: 450,      // Count of leads
      color: "#7fd3ff" // Color for the segment
    },
    {
      label: "Won",
      value: 120,
      color: "#6be585"
    },
    {
      label: "Lost",
      value: 80,
      color: "#ff6584"
    }
  ]
  ```
- **Status Order**: Open, Won, Lost (in that order)
- **Colors**: 
  - Open: `#7fd3ff` (light blue)
  - Won: `#6be585` (green)
  - Lost: `#ff6584` (red)
- **Current Implementation**: 
  - Counts leads by `lead_status` field
  - "Won" = leads where `lead_stage` is "Closed-Won" OR "Order Booked"
  - "Lost" = Closed leads that are not won

---

### 4. **Lead Distribution** (Pie Chart - Donut, 2 columns wide)
- **Location**: `ChartsView.jsx` lines 241-300
- **Chart Type**: Pie/Donut Chart (Recharts)
- **Data Source**: `chartVisuals.segmentDistribution` (processed into `processedSegments`)
- **Data Structure Expected**:
  ```javascript
  [
    {
      segment: "Industrial",  // Segment name
      value: 250              // Number of leads in this segment
    },
    {
      segment: "Commercial",
      value: 180
    },
    // ... more segments
    {
      segment: "Others",      // Aggregated if > 10 segments
      value: 45
    }
  ]
  ```
- **Processing Logic**:
  - Sorted by value (descending)
  - If > 10 segments, top 9 are shown individually, rest grouped as "Others"
- **Colors**: Rotates through `CHART_COLORS` array: `['#7fd3ff', '#6be585', '#f5aa3c', '#ff6584', '#a78bfa', '#fbbf24']`
- **Current Implementation**: Groups leads by `segment` field

---

### 5. **Open vs Closed by Segment** (Grouped Bar Chart)
- **Location**: `ChartsView.jsx` lines 303-329
- **Chart Type**: Grouped Bar Chart (Recharts)
- **Data Source**: `chartVisuals.segmentStatus`
- **Data Structure Expected**:
  ```javascript
  [
    {
      segment: "Industrial",  // Segment name
      open: 120,              // Count of open leads
      closed: 130            // Count of closed leads
    },
    {
      segment: "Commercial",
      open: 80,
      closed: 100
    },
    // ... more segments
  ]
  ```
- **X-Axis**: `segment` (rotated -45 degrees)
- **Y-Axis**: Count of leads
- **Bars**:
  - `open`: Blue (`#7fd3ff`)
  - `closed`: Green (`#6be585`)
- **Current Implementation**: 
  - Groups leads by `segment`
  - Counts `open` (where `lead_status === 'Open'`) and `closed` (where `lead_status !== 'Open'`)

---

### 6. **Average Close Days by Segment** (Horizontal Bar Chart)
- **Location**: `ChartsView.jsx` lines 332-362
- **Chart Type**: Horizontal Bar Chart (Recharts)
- **Data Source**: `chartVisuals.segmentCloseDays` and `chartVisuals.avgCloseDays`
- **Data Structure Expected**:
  ```javascript
  // segmentCloseDays array:
  [
    {
      segment: "Industrial",
      avgCloseDays: 45  // Average days to close for this segment
    },
    {
      segment: "Commercial",
      avgCloseDays: 32
    },
    // ... more segments
  ]
  
  // avgCloseDays (single number):
  38  // Overall average close days across all segments
  ```
- **X-Axis**: Number of days (horizontal)
- **Y-Axis**: `segment` (vertical, category)
- **Bar Data Key**: `avgCloseDays`
- **Header Action**: Shows overall average: "Overall Avg: 38 days"
- **Current Implementation**: 
  - Calculates average of `close_time_days` field grouped by `segment`
  - Only includes leads that have `close_time_days` set

---

## Current Data Flow

### Frontend Flow (Current Implementation)
1. **Data Fetching**: `useLeadData` hook fetches paginated leads from `/api/leads/`
2. **Chart Building**: `buildChartsVisuals(leads)` function in `analytics.js` processes leads client-side
3. **Chart Rendering**: `ChartsView` component receives `chartVisuals` prop and renders charts

### Data Processing (buildChartsVisuals function)
**Location**: `frontend/src/lib/analytics.js` lines 340-480

**Input**: Array of lead objects with fields:
- `enquiry_date` (for monthly grouping)
- `lead_status` (for status counts)
- `lead_stage` (for won/lost determination)
- `segment` (for segment-based charts)
- `close_time_days` (for average close days)
- `win_flag` (optional, for won determination)

**Output**: Object with structure:
```javascript
{
  monthlyLeads: [...],           // Array of {label, leads, conversion}
  conversionTrend: [...],         // Array of {label, conversion}
  statusSummary: [...],           // Array of {label, value}
  segmentStatus: [...],           // Array of {segment, open, closed}
  segmentDistribution: [...],   // Array of {segment, value}
  segmentCloseDays: [...],       // Array of {segment, avgCloseDays}
  avgCloseDays: 38               // Number or null
}
```

---

## Backend API Endpoint (Not Currently Used)

### Endpoint: `GET /api/charts/`
**Location**: `backend/crm/views.py` lines 111-114

**Current Backend Response** (`build_chart_payload` function):
```javascript
{
  "status_summary": [
    {"label": "Lost", "value": 80},
    {"label": "Won", "value": 120},
    {"label": "Closed", "value": 200}
  ],
  "stage_summary": [
    {"label": "Closed-Won", "value": 100},
    // ... more stages
  ],
  "segment_distribution": [
    {"label": "Industrial", "value": 250},
    // ... more segments
  ],
  "dealer_leaderboard": [
    {"label": "Dealer A", "value": 150},
    // ... more dealers
  ],
  "kva_distribution": [
    {"label": "100-200 KVA", "value": 120},
    // ... more KVA ranges
  ]
}
```

**Issue**: The backend response structure **does not match** what the frontend expects. The frontend needs:
- `monthlyLeads` (not provided by backend)
- `conversionTrend` (not provided by backend)
- `statusSummary` (backend has `status_summary` but format differs)
- `segmentStatus` (not provided by backend)
- `segmentDistribution` (backend has `segment_distribution` but key name differs)
- `segmentCloseDays` (not provided by backend)
- `avgCloseDays` (not provided by backend)

---

## Expected API Response Structure (If Using Backend)

To use the backend `/charts/` endpoint, it should return:

```javascript
{
  "monthlyLeads": [
    {
      "label": "Jan 2024",
      "leads": 150,
      "conversion": 12.5
    },
    // ... more months
  ],
  "conversionTrend": [
    {
      "label": "Jan 2024",
      "conversion": 12.5
    },
    // ... more months
  ],
  "statusSummary": [
    {
      "label": "Open",
      "value": 450
    },
    {
      "label": "Won",
      "value": 120
    },
    {
      "label": "Lost",
      "value": 80
    }
  ],
  "segmentDistribution": [
    {
      "segment": "Industrial",
      "value": 250
    },
    // ... more segments
  ],
  "segmentStatus": [
    {
      "segment": "Industrial",
      "open": 120,
      "closed": 130
    },
    // ... more segments
  ],
  "segmentCloseDays": [
    {
      "segment": "Industrial",
      "avgCloseDays": 45
    },
    // ... more segments
  ],
  "avgCloseDays": 38
}
```

---

## Query Parameters

The charts should respect the same filter parameters as other endpoints:
- `start_date` / `end_date` (date filtering)
- `lead_status` (status filtering)
- `segment` (segment filtering)
- `dealer` (dealer filtering)
- `owner` (owner filtering)
- `state`, `city`, `zone` (location filtering)
- `kva_range` (KVA range filtering)
- `fy`, `month` (fiscal year/month filtering)
- `source` (source filtering)

**Current Implementation**: Filters are applied to the leads query, then charts are built from filtered leads.

---

## Performance Considerations

### Current (Client-Side)
- **Pros**: 
  - Works with paginated data
  - No additional API call needed
  - Real-time updates when leads change
- **Cons**: 
  - Only uses paginated leads (may not show all data)
  - Processing happens in browser (slower for large datasets)
  - Duplicates logic between frontend and backend

### Potential (Backend API)
- **Pros**: 
  - Uses database aggregation (faster)
  - Can process all leads (not just paginated)
  - Single source of truth for calculations
- **Cons**: 
  - Requires additional API call
  - Backend response structure needs to match frontend expectations
  - May need caching for performance

---

## Recommendations

1. **Option A: Keep Client-Side (Current)**
   - Works well for paginated views
   - Simple implementation
   - Consider fetching all leads (not paginated) when Charts tab is active

2. **Option B: Use Backend API**
   - Update `build_chart_payload()` in `backend/crm/services_optimized.py` to return the expected structure
   - Add API call in `useLeadData` hook: `apiRequest('charts/', { params: aggregateParams })`
   - Update frontend to use backend response instead of `buildChartsVisuals()`

3. **Option C: Hybrid Approach**
   - Use backend API for aggregate charts (status, distribution)
   - Use client-side for time-series charts (monthly trends) if needed
   - Cache backend responses for better performance

---

## Summary

| Chart | Data Source | Key Fields | Current Status |
|-------|-------------|------------|----------------|
| Monthly Lead Volume | `monthlyLeads` | `enquiry_date` | ✅ Client-side |
| Conversion Rate Trend | `conversionTrend` | `enquiry_date`, `lead_stage` | ✅ Client-side |
| Lead Status | `statusSummary` | `lead_status`, `lead_stage` | ✅ Client-side |
| Lead Distribution | `segmentDistribution` | `segment` | ✅ Client-side |
| Open vs Closed by Segment | `segmentStatus` | `segment`, `lead_status` | ✅ Client-side |
| Average Close Days | `segmentCloseDays` | `segment`, `close_time_days` | ✅ Client-side |

**Backend Endpoint**: `/api/charts/` exists but is **not used** by frontend. Response structure needs to be updated to match frontend expectations if switching to backend API.

