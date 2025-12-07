from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    ActivityLogViewSet,
    AdminStatsView,
    BulkDeleteLeadsView,
    UserManagementViewSet,
)
from .auth_views import CustomAuthToken, logout
from .views import (
    ChartsView,
    ForecastView,
    HealthCheckView,
    InsightsView,
    KpiView,
    LeadUploadCreateView,
    LeadUploadPreviewView,
    LeadViewSet,
    LeadSearchView,
    LeadFieldOptionsView,
    AllFieldOptionsView,
)

router = DefaultRouter()
router.register(r"leads", LeadViewSet, basename="lead")
router.register(r"admin/users", UserManagementViewSet, basename="admin-users")
router.register(r"admin/activity-logs", ActivityLogViewSet, basename="admin-activity-logs")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", HealthCheckView.as_view(), name="health-check"),  # Health check endpoint
    path("kpis/", KpiView.as_view(), name="kpis"),
    path("charts/", ChartsView.as_view(), name="charts"),
    path("forecast/", ForecastView.as_view(), name="forecast"),
    path("insights/", InsightsView.as_view(), name="insights"),
    path(
        "leads/upload/preview/",
        LeadUploadPreviewView.as_view(),
        name="lead-upload-preview",
    ),
    path(
        "leads/upload/create/",
        LeadUploadCreateView.as_view(),
        name="lead-upload-create",
    ),
    path(
        "leads/search/",
        LeadSearchView.as_view(),
        name="lead-search",
    ),
    path(
        "lead-field-options/",
        LeadFieldOptionsView.as_view(),
        name="lead-field-options",
    ),
    path(
        "leads/all-field-options/",
        AllFieldOptionsView.as_view(),
        name="all-field-options",
    ),
    # Admin endpoints
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/bulk-delete-leads/", BulkDeleteLeadsView.as_view(), name="admin-bulk-delete-leads"),
    # Auth endpoints
    path("auth/login/", CustomAuthToken.as_view(), name="api-login"),
    path("auth/logout/", logout, name="api-logout"),
]
