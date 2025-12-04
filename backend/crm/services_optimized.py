"""
Optimized business logic for CRM analytics and reporting.
Uses Django aggregation for performance instead of loading all records into memory.
"""
from django.db.models import (
    Count, Sum, Avg, Q, F, Value, CharField, 
    IntegerField, FloatField, Case, When
)
from django.db.models.functions import TruncMonth, Coalesce
from django.utils import timezone
from collections import defaultdict
from decimal import Decimal


def compute_kpis(queryset):
    """
    Generate KPI metrics using database aggregation.
    
    PERFORMANCE OPTIMIZATION:
    - Before: O(n) memory - loads all records
    - After: O(1) memory - database aggregation
    """
    # Single aggregation query for all KPIs  
    stats = queryset.aggregate(
        total_leads=Count('id'),
        open_leads=Count('id', filter=Q(lead_status='Open')),
        closed_leads=Count('id', filter=Q(lead_status='Closed')),
        won_leads=Count('id', filter=Q(win_flag=True)),
        pipeline_value=Sum('order_value', filter=Q(lead_status='Open'), default=0),
        won_value=Sum('order_value', filter=Q(win_flag=True), default=0),
        # Average close time for closed leads
        avg_close_days=Avg('close_time_days', filter=Q(lead_status='Closed')),
        # Average age for open leads
        avg_lead_age_days=Avg('lead_age_days', filter=Q(lead_status='Open')),
    )
    
    total = stats['total_leads'] or 0
    conversion_rate = (
        (stats['won_leads'] / total * 100) if total > 0 else 0
    )
    
    return {
        'total_leads': total,
        'open_leads': stats['open_leads'] or 0,
        'closed_leads': stats['closed_leads'] or 0,
        'won_leads': stats['won_leads'] or 0,
        'conversion_rate': round(conversion_rate, 1),
        'pipeline_value': float(stats['pipeline_value'] or 0),
        'won_value': float(stats['won_value'] or 0),
        'avg_close_days': round(stats['avg_close_days']) if stats['avg_close_days'] else None,
        'avg_lead_age_days': round(stats['avg_lead_age_days']) if stats['avg_lead_age_days'] else None,
    }


def build_chart_payload(queryset):
    """
    Build chart data using database aggregation.
    
    PERFORMANCE: Uses values + annotate instead of loading all records.
    """
    # Status distribution
    status_summary = list(
        queryset.values('lead_status')
        .annotate(value=Count('id'))
        .annotate(label=Coalesce('lead_status', Value('N/A')))
        .values('label', 'value')
        .order_by('-value')
    )
    
    # Stage distribution
    stage_summary = list(
        queryset.values('lead_stage')
        .annotate(value=Count('id'))
        .annotate(label=Coalesce('lead_stage', Value('N/A')))
        .values('label', 'value')
        .order_by('-value')
    )
    
    # Segment distribution
    segment_distribution = list(
        queryset.values('segment')
        .annotate(value=Count('id'))
        .annotate(label=Coalesce('segment', Value('N/A')))
        .values('label', 'value')
        .order_by('-value')
    )
    
    # Dealer leaderboard
    dealer_leaderboard = list(
        queryset.values('dealer')
        .annotate(value=Count('id'))
        .annotate(label=Coalesce('dealer', Value('N/A')))
        .values('label', 'value')
        .order_by('-value')
    )
    
    # KVA distribution
    kva_distribution = list(
        queryset.values('kva_range')
        .annotate(value=Count('id'))
        .annotate(label=Coalesce('kva_range', Value('N/A')))
        .values('label', 'value')
        .order_by('-value')
    )
    
    return {
        'status_summary': status_summary,
        'stage_summary': stage_summary,
        'segment_distribution': segment_distribution,
        'dealer_leaderboard': dealer_leaderboard,
        'kva_distribution': kva_distribution,
    }


def build_insights(queryset):
    """
    Generate insights using database aggregation.
    
    PERFORMANCE: Filters and counts in database instead of Python.
    """
    # High value leads count
    high_value_count = queryset.filter(
        order_value__gte=1_000_000  # Use setting value in production
    ).count()
    
    # Overdue follow-ups
    today = timezone.now().date()
    overdue_count = queryset.filter(
        lead_status='Open',
        next_followup_date__lt=today
    ).count()
    
    # Loss reasons (for lost leads)
    loss_reasons = list(
        queryset.filter(lead_stage__icontains='lost')
        .values('loss_reason')
        .annotate(value=Count('id'))
        .annotate(label=Coalesce('loss_reason', Value('N/A')))
        .values('label', 'value')
        .order_by('-value')
    )
    
    # Fastest closing segments (segments with best avg close time)
    fastest_segments = list(
        queryset.filter(lead_status='Closed', close_time_days__isnull=False)
        .values('segment')
        .annotate(
            avg_close_time=Avg('close_time_days'),
            count=Count('id')
        )
        .filter(count__gte=5)  # At least 5 leads for statistical significance  
        .annotate(label=Coalesce('segment', Value('Unknown')))
        .values('label', 'avg_close_time', 'count')
        .order_by('avg_close_time')[:5]
    )
    
    # Format for response
    fastest_segments_formatted = [
        {
            'label': item['label'],
            'avg_close_time': round(item['avg_close_time']),
            'sample_size': item['count']
        }
        for item in fastest_segments
    ]
    
    return {
        'high_value_count': high_value_count,
        'overdue': overdue_count,
        'loss_reasons': loss_reasons,
        'fastest_segments': fastest_segments_formatted,
    }


def compute_forecast(queryset):
    """
    Compute forecast data using database aggregation.
    
    PERFORMANCE: Aggregates by month in database.
    """
    # Get monthly trends
    monthly_data = list(
        queryset.annotate(month=TruncMonth('enquiry_date'))
        .values('month')
        .annotate(
            lead_count=Count('id'),
            won_count=Count('id', filter=Q(win_flag=True)),
            total_value=Sum('order_value', default=0),
            won_value=Sum('order_value', filter=Q(win_flag=True), default=0)
        )
        .order_by('month')
    )
    
    # Calculate trends
    if len(monthly_data) >= 2:
        recent_month = monthly_data[-1]
        previous_month = monthly_data[-2]
        
        lead_trend = (
            (recent_month['lead_count'] - previous_month['lead_count']) 
            / previous_month['lead_count'] * 100
            if previous_month['lead_count'] > 0 else 0
        )
    else:
        lead_trend = 0
    
    # Current month stats
    current_stats = queryset.filter(
        enquiry_date__month=timezone.now().month,
        enquiry_date__year=timezone.now().year
    ).aggregate(
        current_month_leads=Count('id'),
        current_month_value=Sum('order_value', default=0)
    )
    
    return {
        'monthly_trends': [
            {
                'month': item['month'].strftime('%Y-%m') if item['month'] else 'Unknown',
                'leads': item['lead_count'],
                'won': item['won_count'],
                'value': float(item['total_value']),
            }
            for item in monthly_data
        ],
        'lead_trend_percentage': round(lead_trend, 1),
        'current_month_leads': current_stats['current_month_leads'] or 0,
        'projected_month_end': current_stats['current_month_leads'] * 2,  # Simple projection
    }
