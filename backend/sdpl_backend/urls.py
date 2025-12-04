"""
URL configuration for sdpl_backend project.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('crm.urls')),  # API versioning - v1
]
