"""
Cached views using Django cache decorators.
"""
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services_optimized import compute_kpis, build_chart_payload, build_insights, compute_forecast


class CachedKpiView(APIView):
    """
    KPI endpoint with caching.
    Cache for 5 minutes to reduce database load.
    """
    
    @method_decorator(cache_page(60 * 5))  # 5 minutes
    def get(self, request):
        queryset = self.get_queryset(request)
        kpis = compute_kpis(queryset)
        return Response(kpis)
    
    def get_queryset(self, request):
        from .models import Lead
        from .views import apply_filters  # Import your filter logic
        
        queryset = Lead.objects.all()
        queryset = apply_filters(queryset, request.query_params)
        return queryset


class CachedChartsView(APIView):
    """
    Charts endpoint with caching.
    Cache for 10 minutes.
    """
    
    @method_decorator(cache_page(60 * 10))  # 10 minutes
    def get(self, request):
        queryset = self.get_queryset(request)
        charts = build_chart_payload(queryset)
        return Response(charts)
    
    def get_queryset(self, request):
        from .models import Lead
        from .views import apply_filters
        
        queryset = Lead.objects.all()
        queryset = apply_filters(queryset, request.query_params)
        return queryset


# Manual caching for complex operations
class ManualCacheExample(APIView):
    """
    Example of manual cache key management.
    Useful when you need fine-grained control.
    """
    
    def get(self, request):
        # Build cache key based on filters
        filters = request.query_params.dict()
        cache_key = f"kpis_{hash(frozenset(filters.items()))}"
        
        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Compute if not in cache
        queryset = self.get_queryset(request)
        kpis = compute_kpis(queryset)
        
        # Store in cache for 5 minutes
        cache.set(cache_key, kpis, timeout=300)
        
        return Response(kpis)
    
    def get_queryset(self, request):
        from .models import Lead
        from .views import apply_filters
        
        queryset = Lead.objects.all()
        queryset = apply_filters(queryset, request.query_params)
        return queryset


# Cache invalidation helper
def invalidate_lead_caches():
    """
    Invalidate all lead-related caches when data changes.
    Call this after create/update/delete operations.
    """
    cache_patterns = [
        'kpis_*',
        'charts_*',
        'insights_*',
        'forecast_*',
    ]
    
    for pattern in cache_patterns:
        cache.delete_pattern(pattern)
