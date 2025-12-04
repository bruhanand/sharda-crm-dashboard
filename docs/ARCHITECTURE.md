# Architecture Documentation

## System Overview

The CRM Analytics Application is a modern, full-stack web application built with Django (backend) and React (frontend), designed for comprehensive lead management and business analytics.

---

## High-Level Architecture

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  React Frontend │ (Port 3000)
│   - Vite Build  │
│   - React 19    │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│ Django Backend  │ (Port 8000)
│   - DRF API     │
│   - Business    │
│     Logic       │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌─────────┐ ┌────────┐ ┌───────┐
│Postgres │ │ Redis  │ │ Files │
│Database │ │ Cache  │ │Storage│
└─────────┘ └────────┘ └───────┘
```

---

## Backend Architecture

### Layer Structure

```
┌──────────────────────────────┐
│      API Layer (views.py)    │  ← REST endpoints
├──────────────────────────────┤
│   Business Logic (services)  │  ← Analytics, KPIs
├──────────────────────────────┤
│    Data Layer (models.py)    │  ← ORM models
├──────────────────────────────┤
│      PostgreSQL Database     │  ← Data storage
└──────────────────────────────┘
```

### Key Components

**Models** (`crm/models.py`)
- `Lead` - Core CRM entity
- `ActivityLog` - Audit trail
- Calculated properties (age, close_time)

**Views** (`crm/views.py`)
- `LeadViewSet` - CRUD operations
- `KpiView` - Analytics endpoint
- `ChartsView` - Visualization data
- `LeadUploadView` - Bulk operations

**Services** (`crm/services_optimized.py`)
- `compute_kpis()` - Aggregated metrics
- `build_chart_payload()` - Chart data
- `build_insights()` - Business insights
- `compute_forecast()` - Trend analysis

**Serializers** (`crm/serializers.py`)
- Input validation
- Output formatting
- Security layer

---

## Frontend Architecture

### Component Hierarchy

```
App
├── Login
└── Dashboard
    ├── Header
    ├── FilterBar
    ├── KPICards
    ├── LeadTable
    ├── ChartsView
    └── UploadModal
```

### State Management

```
AppContext (Global State)
├── Authentication (useAuth)
├── Filters (useFilters)
├── Upload (useUpload)
└── Lead Data (useLeadData)
```

### Custom Hooks

- `useAuth` - Authentication state
- `useFilters` - Filter management
- `useUpload` - File upload logic
- `useLeadData` - Data fetching

### Service Layer

```
leadService (API Abstraction)
├── getLeads()
├── updateLead()
├── uploadPreview()
├── getKPIs()
└── getCharts()
```

---

## Data Flow

### Read Operation (Get Leads)

```
User Input
    ↓
FilterBar → useFilters hook
    ↓
leadService.getLeads(filters)
    ↓
Backend API (/api/v1/leads/)
    ↓
LeadViewSet.list()
    ↓
Database Query (with filters)
    ↓
LeadSerializer
    ↓
JSON Response
    ↓
React State Update
    ↓
UI Re-render
```

### Write Operation (Upload Leads)

```
File Upload
    ↓
FormData → leadService.uploadPreview()
    ↓
Backend (/api/v1/leads/upload/preview/)
    ↓
LeadUploadPreviewView
    ↓
Parse CSV/Excel
    ↓
Batch Query (existing leads)
    ↓
Diff Calculation
    ↓
Preview Response
    ↓
User Confirmation
    ↓
leadService.uploadCreate()
    ↓
Serializer Validation
    ↓
Bulk Create/Update
    ↓
Success Response
```

---

## Database Design

### Core Tables

```sql
Lead
├── id (PK)
├── enquiry_id (UNIQUE)
├── dealer
├── lead_status
├── order_value
├── enquiry_date
└── ... (30+ fields)

ActivityLog
├── id (PK)
├── user_id (FK)
├── action
├── timestamp
└── metadata (JSON)
```

### Indexes (Performance)

```sql
CREATE INDEX idx_lead_status ON lead(lead_status);
CREATE INDEX idx_win_flag ON lead(win_flag);
CREATE INDEX idx_enquiry_date ON lead(enquiry_date);
CREATE INDEX idx_status_date ON lead(lead_status, enquiry_date);
CREATE INDEX idx_dealer ON lead(dealer);
```

---

## API Design

### RESTful Endpoints

```
/api/v1/
├── auth/
│   ├── login/           POST
│   └── logout/          POST
├── leads/
│   ├── /                GET, POST
│   ├── /{id}/           GET, PATCH, DELETE
│   └── upload/
│       ├── preview/     POST
│       └── create/      POST
├── kpis/               GET
├── charts/             GET
├── forecast/           GET
└── insights/           GET
```

### Request/Response Format

**Standard Success**:
```json
{
  "results": [...],
  "count": 100,
  "next": "...",
  "previous": null
}
```

**Standard Error**:
```json
{
  "error": {
    "message": "User-friendly message",
    "code": "ERROR_CODE",
    "details": {...}
  }
}
```

---

## Security Architecture

### Authentication Flow

```
1. User Login
   ↓
2. Backend validates credentials
   ↓
3. Generate Token
   ↓
4. Return Token + User data
   ↓
5. Frontend stores in localStorage
   ↓
6. Include in subsequent requests
   (Authorization: Token xxx)
```

### Security Layers

1. **Input Validation** - DRF Serializers
2. **SQL Injection Prevention** - ORM + Validation
3. **Rate Limiting** - django-ratelimit (10/hour)
4. **CORS** - Whitelisted origins
5. **CSRF Protection** - Django middleware

---

## Performance Optimizations

### Backend

**Database**:
- Aggregation queries (O(1) memory)
- Strategic indexes (10x speed)
- Connection pooling

**Caching**:
- Redis for KPIs (5 min TTL)
- Aggregated data caching
- Cache invalidation on updates

### Frontend

**Rendering**:
- React.memo() for expensive components
- useMemo() for calculations
- Code splitting with lazy()

**Bundle**:
- Vite optimization
- Tree shaking
- Lazy loading routes

---

## Deployment Architecture

### Docker Containers

```
┌─────────────────────────────┐
│    Docker Compose Network   │
├─────────────────────────────┤
│  ┌──────────┐  ┌─────────┐ │
│  │ Frontend │  │ Backend │ │
│  │   :3000  │  │  :8000  │ │
│  └──────────┘  └─────────┘ │
│       │            │        │
│  ┌────┴────────────┴─────┐ │
│  │    Postgres :5432     │ │
│  └──────────────────────┘ │
│  ┌──────────────────────┐ │
│  │     Redis :6379      │ │
│  └──────────────────────┘ │
└─────────────────────────────┘
```

### Production Setup

```
Internet
    ↓
Nginx (Reverse Proxy + SSL)
    ↓
┌────────────────────┐
│  Docker Containers │
│  - Frontend        │
│  - Backend         │
│  - Database        │
│  - Cache           │
└────────────────────┘
```

---

## Monitoring & Logging

### Application Logs
- Django logging to files
- Rotation (10MB, 5 backups)
- Error tracking

### System Metrics
- Docker stats
- Database connections
- Cache hit rates

---

## Scalability Considerations

### Horizontal Scaling
- Stateless backend (load balancer ready)
- Redis for shared cache
- Database read replicas

### Vertical Scaling
- Connection pooling
- Query optimization
- Caching strategy

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19 |
| Frontend Build | Vite | 7 |
| Backend Framework | Django | 5.2 |
| API Framework | DRF | 3.16 |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Server | Gunicorn | 21+ |
| Containerization | Docker | 20+ |

---

**Last Updated**: 2024-12-05
