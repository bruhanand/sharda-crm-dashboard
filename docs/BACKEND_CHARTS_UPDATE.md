# Backend Charts API Update - Frontend as Source of Truth

## Summary
Updated the backend `/api/charts/` endpoint to match the frontend's expected data structure. The frontend now uses the backend API instead of building charts client-side from paginated data.

## Changes Made

### 1. Backend: `backend/crm/services.py`
**Updated `build_chart_payload()` function** to return structure matching frontend expectations:

**Before:**
```python
{
    'status_summary': [...],      # Wrong format
    'segment_distribution': [...], # Wrong key name
    # Missing: monthlyLeads, conversionTrend, segmentStatus, segmentCloseDays, avgCloseDays
}
```

**After:**
```python
{
    'monthlyLeads': [
        {'label': 'Jan 2024', 'leads': 150, 'conversion': 12.5},
        # ... more months
    ],
    'conversionTrend': [
        {'label': 'Jan 2024', 'conversion': 12.5},
        # ... more months
    ],
    'statusSummary': [
        {'label': 'Open', 'value': 450},
        {'label': 'Won', 'value': 120},
        {'label': 'Lost', 'value': 80}
    ],
    'segmentDistribution': [
        {'segment': 'Industrial', 'value': 250},
        # ... more segments
    ],
    'segmentStatus': [
        {'segment': 'Industrial', 'open': 120, 'closed': 130},
        # ... more segments
    ],
    'segmentCloseDays': [
        {'segment': 'Industrial', 'avgCloseDays': 45},
        # ... more segments
    ],
    'avgCloseDays': 38  # Overall average
}
```

### 2. Backend: `backend/crm/services_optimized.py`
**Updated `build_chart_payload()` function** with the same structure, using database aggregation where possible for better performance.

### 3. Frontend: `frontend/src/hooks/useLeadData.js`
**Added chart data fetching from backend API:**

- Added `chartData` state variable
- Added API call to `charts/` endpoint in the request chain
- Returns `chartData` from the hook
- Falls back gracefully if API call fails (Dashboard will use client-side building)

**Changes:**
```javascript
// Added state
const [chartData, setChartData] = useState(null)

// Added to API requests
apiRequest('charts/', { params: aggregateParams, signal: controller.signal })

// Set chart data from backend
setChartData(chartResponse)

// Return chartData
return {
    // ... other returns
    chartData,
}
```

### 4. Frontend: `frontend/src/components/Dashboard.jsx`
**No changes needed** - Already configured to use `chartData` when available:
```javascript
const chartVisuals = useMemo(() => {
    if (chartData) {
        return chartData  // Use backend data
    }
    return buildChartsVisuals(leads)  // Fallback to client-side
}, [chartData, leads])
```

## Data Structure Details

### monthlyLeads
- **Purpose**: Monthly lead volume bar chart
- **Format**: `[{label: "Jan 2024", leads: 150, conversion: 12.5}]`
- **Source**: Groups leads by `enquiry_date` month
- **Calculation**: Counts leads per month, calculates conversion rate

### conversionTrend
- **Purpose**: Conversion rate trend line chart
- **Format**: `[{label: "Jan 2024", conversion: 12.5}]`
- **Source**: Derived from `monthlyLeads`
- **Calculation**: Same as monthlyLeads but only conversion percentage

### statusSummary
- **Purpose**: Lead status pie chart (Open/Won/Lost)
- **Format**: `[{label: "Open", value: 450}, {label: "Won", value: 120}, {label: "Lost", value: 80}]`
- **Source**: Aggregates by `lead_status` and `lead_stage`
- **Calculation**: 
  - Open: `lead_status == 'Open'`
  - Won: `lead_stage == 'Closed-Won' OR 'Order Booked'`
  - Lost: Closed leads that are not won

### segmentDistribution
- **Purpose**: Lead distribution pie chart by segment
- **Format**: `[{segment: "Industrial", value: 250}]`
- **Source**: Groups by `segment` field
- **Calculation**: Counts leads per segment

### segmentStatus
- **Purpose**: Open vs Closed grouped bar chart by segment
- **Format**: `[{segment: "Industrial", open: 120, closed: 130}]`
- **Source**: Groups by `segment` and `lead_status`
- **Calculation**: Counts open and closed leads per segment

### segmentCloseDays
- **Purpose**: Average close days horizontal bar chart by segment
- **Format**: `[{segment: "Industrial", avgCloseDays: 45}]`
- **Source**: Groups by `segment` and averages `close_time_days`
- **Calculation**: Average of `close_time_days` per segment (only for closed leads)

### avgCloseDays
- **Purpose**: Overall average close days metric
- **Format**: `38` (number or null)
- **Source**: Averages `close_time_days` across all closed leads
- **Calculation**: Overall average of `close_time_days`

## Benefits

1. **Performance**: Backend uses database aggregation instead of loading all records
2. **Accuracy**: Uses all leads (not just paginated subset) for chart calculations
3. **Consistency**: Single source of truth for chart calculations
4. **Scalability**: Better performance for large datasets
5. **Maintainability**: Chart logic centralized in backend

## Backward Compatibility

- Frontend still has fallback to client-side chart building if backend API fails
- Dashboard component automatically uses `chartData` when available, falls back to `buildChartsVisuals(leads)` otherwise
- No breaking changes to existing functionality

## Testing

To test the changes:

1. **Backend**: Verify `/api/charts/` endpoint returns correct structure
   ```bash
   curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/charts/
   ```

2. **Frontend**: 
   - Open Charts tab
   - Verify all 6 charts render correctly
   - Check browser network tab to see `/api/charts/` request
   - Verify charts show data matching filters

3. **Filter Testing**: 
   - Apply date filters
   - Apply segment/status filters
   - Verify charts update correctly

## API Endpoint

**Endpoint**: `GET /api/charts/`

**Query Parameters**: Same as other endpoints (filters)
- `start_date`, `end_date`
- `lead_status`, `segment`, `dealer`, `owner`
- `state`, `city`, `zone`
- `kva_range`, `fy`, `month`
- `source`

**Response**: JSON object with structure matching frontend expectations (see above)

**Authentication**: Required (same as other endpoints)

