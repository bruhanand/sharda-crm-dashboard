"""
Optimized business logic for CRM analytics and reporting.
Uses Django aggregation for performance instead of loading all records into memory.
"""
from django.db.models import (
    Count, Sum, Avg, Q, F, Value, FloatField,
)
from django.db.models.functions import TruncMonth, Coalesce, Cast
from django.utils import timezone


def compute_kpis(queryset):
    """
    Generate KPI metrics using database aggregation.

    Updated KPI Calculations:
    - Total leads: count of all leads
    - Open leads: count where lead_status='Open'
    - Closed leads: total - open
   - Won leads: count where lead_stage contains 'closed won' or 'order booked'
    - Lost leads: closed - won
    - Conversion rate: (won / total) * 100
    - Avg lead age: average of lead_age_days for ALL leads (not just open)
    - Avg close time: average close_time_days for CLOSED leads only

    PERFORMANCE OPTIMIZATION:
    - Before: O(n) memory - loads all records
    - After: O(1) memory - database aggregation
    """
    # Single aggregation query for all KPIs
    stats = queryset.aggregate(
        total_leads=Count('id'),
        open_leads=Count('id', filter=Q(lead_status='Open')),
        # Won leads: lead_stage contains BOTH 'closed won' AND 'order booked' (case-insensitive)
        won_leads=Count('id', filter=(
            Q(lead_stage__icontains='closed won') &
            Q(lead_stage__icontains='order booked')
        )),
        pipeline_value=Sum('order_value', filter=Q(
            lead_status='Open'), default=0),
        won_value=Sum('order_value', filter=(
            Q(lead_stage__icontains='closed won') |
            Q(lead_stage__icontains='order booked')
        ), default=0),
        # Average close time for CLOSED leads only
        avg_close_days=Avg('close_time_days', filter=Q(lead_status='Closed')),
        # Average lead age for ALL leads (not just open)
        avg_lead_age_days=Avg('lead_age_days'),
    )

    total = stats['total_leads'] or 0
    open_leads = stats['open_leads'] or 0
    won_leads = stats['won_leads'] or 0

    # Closed leads = Total - Open
    closed_leads = total - open_leads

    # Lost leads = Closed - Won
    lost_leads = closed_leads - won_leads

    # Conversion rate = (won / total) * 100
    conversion_rate = (
        (won_leads / total * 100) if total > 0 else 0
    )

    return {
        'total_leads': total,
        'open_leads': open_leads,
        'closed_leads': closed_leads,
        'won_leads': won_leads,
        'lost_leads': lost_leads,  # New metric
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

    # Lead Behavior Clusters (based on engagement/followup count)
    clusters = list(
        queryset.values('followup_count')
        .annotate(count=Count('id'))
        .order_by('followup_count')
    )

    # Group into engagement clusters
    cluster_data = []
    for item in clusters:
        followup_count = item['followup_count'] or 0
        if followup_count == 0:
            label = 'No Follow-Up'
        elif followup_count <= 2:
            label = 'Low Engagement'
        elif followup_count <= 5:
            label = 'Medium Engagement'
        else:
            label = 'High Engagement'

        # Find or add to cluster
        existing = next((c for c in cluster_data if c['label'] == label), None)
        if existing:
            existing['value'] += item['count']
        else:
            cluster_data.append({'label': label, 'value': item['count']})

    # Employee Conversion (top employees by conversion rate)
    employee_conversion = list(
        queryset.exclude(owner__isnull=True)
        .exclude(owner='')
        .values('owner')
        .annotate(
            total=Count('id'),
            won=Count('id', filter=(
                Q(lead_stage__icontains='closed won') |
                Q(lead_stage__icontains='order booked')
            ))
        )
        .filter(total__gte=5)  # At least 5 leads for significance
        .annotate(
            label=F('owner'),
            conversion_rate=Cast(F('won'), FloatField()) /
            Cast(F('total'), FloatField()) * 100
        )
        .values('label', 'conversion_rate', 'total', 'won')
        .order_by('-conversion_rate')[:10]
    )

    # Format employee conversion
    employee_conversion_formatted = [
        {
            'label': item['label'],
            'conversion_rate': round(item['conversion_rate'], 1),
            'total_leads': item['total'],
            'won_leads': item['won']
        }
        for item in employee_conversion
    ]

    return {
        'highValueCount': high_value_count,
        'overdueFollowups': overdue_count,
        'lossReasons': loss_reasons,
        'fastestSegments': fastest_segments_formatted,
        'clusters': cluster_data,
        'employeeConversion': employee_conversion_formatted,
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
        # Simple projection
        'projected_month_end': current_stats['current_month_leads'] * 2,
    }
