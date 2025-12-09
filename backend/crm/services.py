from __future__ import annotations

from collections import Counter, defaultdict
from decimal import Decimal
from typing import Iterable

from django.utils import timezone

from .models import Lead


def _as_list(queryset) -> list[Lead]:
    if isinstance(queryset, Iterable):
        return list(queryset)
    return queryset


def _group_counts(leads: list[Lead], attr: str) -> list[dict]:
    counter = Counter(getattr(lead, attr) or "N/A" for lead in leads)
    return sorted(
        [{"label": label, "value": value} for label, value in counter.items()],
        key=lambda item: item["value"],
        reverse=True,
    )


def compute_kpis(queryset):
    """
    Generate KPI metrics from queryset.

    Updated KPI Calculations:
    - Total leads: count of all leads
    - Open leads: count where lead_status='Open'
    - Closed leads: total - open
    - Won leads: count where lead_stage equals 'Closed-Won' OR 'Order Booked'
    - Lost leads: closed - won
    - Conversion rate: (won / total) * 100
    - Avg lead age: average of lead_age_days for ALL leads (not just open)
    - Avg close time: average close_time_days for CLOSED leads only
    """
    leads = _as_list(queryset)
    total = len(leads)
    open_leads_list = [lead for lead in leads if lead.lead_status == "Open"]
    closed_leads_list = [
        lead for lead in leads if lead.lead_status == "Closed"]

    # Won leads: lead_stage equals 'Closed-Won' OR 'Order Booked' (case-insensitive)
    won_leads_list = [
        lead for lead in leads
        if lead.lead_stage
        and (lead.lead_stage.strip().lower() == 'closed-won' or lead.lead_stage.strip().lower() == 'order booked')
    ]

    def _sum(values):
        total = Decimal("0")
        for lead in values:
            value = lead.order_value or Decimal("0")
            total += Decimal(value)
        return float(total)

    pipeline_value = _sum(open_leads_list)
    won_value = _sum(won_leads_list)

    # Closed leads = Total - Open
    closed_count = total - len(open_leads_list)

    # Lost leads = Closed - Won
    lost_count = closed_count - len(won_leads_list)

    # Average close time for CLOSED leads only
    leads_with_close_time = [l for l in closed_leads_list if l.close_time_days]
    avg_close = (
        round(sum(l.close_time_days for l in leads_with_close_time) /
              len(leads_with_close_time))
        if leads_with_close_time
        else None
    )

    # Average lead age for ALL leads (not just open)
    leads_with_age = [l for l in leads if l.lead_age_days]
    avg_age = (
        round(sum(l.lead_age_days for l in leads_with_age) / len(leads_with_age))
        if leads_with_age
        else None
    )

    return {
        "total_leads": total,
        "open_leads": len(open_leads_list),
        "closed_leads": closed_count,
        "won_leads": len(won_leads_list),
        "lost_leads": lost_count,  # New metric
        "conversion_rate": round((len(won_leads_list) / total) * 100, 1) if total else 0,
        "pipeline_value": pipeline_value,
        "won_value": won_value,
        "avg_close_days": avg_close,
        "avg_lead_age_days": avg_age,
    }


def build_chart_payload(queryset):
    """
    Build chart data matching frontend's expected structure.
    
    Returns structure compatible with ChartsView component:
    - monthlyLeads: Monthly lead volume with conversion rates
    - conversionTrend: Conversion rate trend over time
    - statusSummary: Open/Won/Lost counts
    - segmentDistribution: Leads grouped by segment
    - segmentStatus: Open vs Closed counts per segment
    - segmentCloseDays: Average close days per segment
    - avgCloseDays: Overall average close days
    """
    from collections import defaultdict
    from datetime import datetime
    
    leads = _as_list(queryset)
    
    # Helper to normalize stage for won determination
    def is_won(lead):
        if not lead.lead_stage:
            return False
        stage_lower = lead.lead_stage.strip().lower()
        return stage_lower == 'closed-won' or stage_lower == 'order booked'
    
    # Helper to normalize status
    def normalize_status(lead):
        status = (lead.lead_status or '').strip().lower()
        return 'open' if status == 'open' else 'closed'
    
    # Monthly leads aggregation
    monthly_map = defaultdict(lambda: {'leads': 0, 'won': 0})
    
    # Status counts
    open_count = 0
    won_count = 0
    lost_count = 0
    
    # Segment aggregations
    segment_distribution = defaultdict(int)
    segment_status = defaultdict(lambda: {'open': 0, 'closed': 0})
    segment_close_days = defaultdict(lambda: {'total': 0, 'count': 0})
    
    # Overall close days tracking
    total_close_days = 0
    close_days_count = 0
    
    for lead in leads:
        # Monthly grouping
        if lead.enquiry_date:
            try:
                # Parse date and create month key
                if isinstance(lead.enquiry_date, str):
                    date_obj = datetime.strptime(lead.enquiry_date.split('T')[0], '%Y-%m-%d')
                else:
                    date_obj = lead.enquiry_date
                
                month_key = f"{date_obj.year}-{date_obj.month:02d}"
                month_label = date_obj.strftime('%b %Y')  # e.g., "Jan 2024"
                
                monthly_map[month_key]['leads'] += 1
                monthly_map[month_key]['label'] = month_label
                if is_won(lead):
                    monthly_map[month_key]['won'] += 1
            except (ValueError, AttributeError):
                pass
        
        # Status counts
        status_norm = normalize_status(lead)
        is_won_lead = is_won(lead)
        
        if status_norm == 'open':
            open_count += 1
        else:
            if is_won_lead:
                won_count += 1
            else:
                lost_count += 1
        
        # Segment distribution
        segment = lead.segment or 'Unspecified'
        segment_distribution[segment] += 1
        
        # Segment status (open vs closed)
        if status_norm == 'open':
            segment_status[segment]['open'] += 1
        else:
            segment_status[segment]['closed'] += 1
        
        # Segment close days
        if lead.close_time_days is not None:
            segment_close_days[segment]['total'] += lead.close_time_days
            segment_close_days[segment]['count'] += 1
            total_close_days += lead.close_time_days
            close_days_count += 1
    
    # Build monthlyLeads array
    monthly_leads = []
    for month_key in sorted(monthly_map.keys()):
        entry = monthly_map[month_key]
        leads_count = entry['leads']
        won_count_month = entry['won']
        conversion = round((won_count_month / leads_count * 100), 1) if leads_count > 0 else 0
        
        monthly_leads.append({
            'label': entry['label'],
            'leads': leads_count,
            'conversion': conversion
        })
    
    # Build conversionTrend (same as monthlyLeads but only conversion)
    conversion_trend = [
        {'label': item['label'], 'conversion': item['conversion']}
        for item in monthly_leads
    ]
    
    # Build statusSummary (Open, Won, Lost)
    status_summary = [
        {'label': 'Open', 'value': open_count},
        {'label': 'Won', 'value': won_count},
        {'label': 'Lost', 'value': lost_count}
    ]
    
    # Build segmentDistribution
    segment_distribution_arr = [
        {'segment': segment, 'value': count}
        for segment, count in sorted(segment_distribution.items(), key=lambda x: x[1], reverse=True)
    ]
    
    # Build segmentStatus
    segment_status_arr = [
        {
            'segment': segment,
            'open': stats['open'],
            'closed': stats['closed']
        }
        for segment, stats in sorted(
            segment_status.items(),
            key=lambda x: x[1]['open'] + x[1]['closed'],
            reverse=True
        )
    ]
    
    # Build segmentCloseDays
    segment_close_days_arr = []
    for segment, stats in segment_close_days.items():
        if stats['count'] > 0:
            segment_close_days_arr.append({
                'segment': segment,
                'avgCloseDays': round(stats['total'] / stats['count'])
            })
    
    # Sort by avgCloseDays descending
    segment_close_days_arr.sort(key=lambda x: x['avgCloseDays'], reverse=True)
    
    # Calculate overall average close days
    avg_close_days = round(total_close_days / close_days_count) if close_days_count > 0 else None
    
    return {
        'monthlyLeads': monthly_leads,
        'conversionTrend': conversion_trend,
        'statusSummary': status_summary,
        'segmentDistribution': segment_distribution_arr,
        'segmentStatus': segment_status_arr,
        'segmentCloseDays': segment_close_days_arr,
        'avgCloseDays': avg_close_days
    }


def build_insights(queryset):
    leads = _as_list(queryset)
    high_value = [lead for lead in leads if lead.is_high_value]
    overdue = [
        lead
        for lead in leads
        if lead.lead_status == "Open"
        and lead.next_followup_date
        and lead.next_followup_date < timezone.now().date()
    ]

    loss_reasons = _group_counts(
        [lead for lead in leads if "lost" in (lead.lead_stage or "").lower()],
        "loss_reason",
    )

    fastest_segments = sorted(
        [
            {
                "segment": segment,
                "avg_close_time": round(sum(times) / len(times)),
            }
            for segment, times in _aggregate_by_segment_close_time(leads).items()
        ],
        key=lambda item: item["avg_close_time"],
    )

    return {
        "high_value_count": len(high_value),
        "overdue_followups": len(overdue),
        "loss_reasons": loss_reasons,
        "fastest_segments": fastest_segments[:5],
    }


def _aggregate_by_segment_close_time(leads: list[Lead]):
    data = defaultdict(list)
    for lead in leads:
        if lead.segment and lead.close_time_days:
            data[lead.segment].append(lead.close_time_days)
    return data


def build_forecast(queryset):
    leads = _as_list(queryset)
    buckets = defaultdict(lambda: {"leads": 0, "wins": 0})
    for lead in leads:
        label = f"{lead.month}-{lead.fy}" if lead.month and lead.fy else "Unknown"
        buckets[label]["leads"] += 1
        if lead.win_flag:
            buckets[label]["wins"] += 1
    forecast_rows = []
    for label, stats in buckets.items():
        conv = round((stats["wins"] / stats["leads"])
                     * 100, 1) if stats["leads"] else 0
        forecast_rows.append(
            {"label": label, "leads": stats["leads"], "conversion_pct": conv})
    forecast_rows.sort(key=lambda item: item["label"])
    return forecast_rows
