from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
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
    leads = _as_list(queryset)
    total = len(leads)
    open_leads = [lead for lead in leads if lead.lead_status == "Open"]
    closed_leads = [lead for lead in leads if lead.lead_status == "Closed"]
    won_leads = [lead for lead in leads if lead.win_flag]

    def _sum(values):
        total = Decimal("0")
        for lead in values:
            value = lead.order_value or Decimal("0")
            total += Decimal(value)
        return float(total)

    pipeline_value = _sum(open_leads)
    won_value = _sum(won_leads)

    leads_with_close_time = [l for l in closed_leads if l.close_time_days]
    avg_close = (
        round(sum(l.close_time_days for l in leads_with_close_time) / len(leads_with_close_time))
        if leads_with_close_time
        else None
    )
    leads_with_age = [l for l in open_leads if l.lead_age_days]
    avg_age = (
        round(sum(l.lead_age_days for l in leads_with_age) / len(leads_with_age))
        if leads_with_age
        else None
    )

    return {
        "total_leads": total,
        "open_leads": len(open_leads),
        "closed_leads": len(closed_leads),
        "won_leads": len(won_leads),
        "conversion_rate": round((len(won_leads) / total) * 100, 1) if total else 0,
        "pipeline_value": pipeline_value,
        "won_value": won_value,
        "avg_close_days": avg_close,
        "avg_lead_age_days": avg_age,
    }


def build_chart_payload(queryset):
    leads = _as_list(queryset)
    return {
        "status_summary": _group_counts(leads, "lead_status"),
        "stage_summary": _group_counts(leads, "lead_stage"),
        "segment_distribution": _group_counts(leads, "segment"),
        "dealer_leaderboard": _group_counts(leads, "dealer"),
        "kva_distribution": _group_counts(leads, "kva_range"),
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
        conv = round((stats["wins"] / stats["leads"]) * 100, 1) if stats["leads"] else 0
        forecast_rows.append({"label": label, "leads": stats["leads"], "conversion_pct": conv})
    forecast_rows.sort(key=lambda item: item["label"])
    return forecast_rows

