from django.conf import settings
from django.utils import timezone
from django_filters import rest_framework as filters

from rest_framework.exceptions import ValidationError

from .models import Lead


class LeadFilter(filters.FilterSet):
    date_mode = filters.ChoiceFilter(
        label="Date Mode",
        choices=(("enquiry", "Enquiry"), ("close", "Close")),
        method="filter_date_mode",
    )
    start_date = filters.DateFilter(method="filter_date_range")
    end_date = filters.DateFilter(method="filter_date_range")
    high_value_only = filters.BooleanFilter(method="filter_high_value")
    followup_due_only = filters.BooleanFilter(method="filter_followup_due")

    class Meta:
        model = Lead
        fields = {
            "lead_status": ["exact"],
            "lead_stage": ["exact"],
            "dealer": ["exact"],
            "state": ["exact"],
            "city": ["exact"],
            "segment": ["exact"],
            "kva_range": ["exact"],
            "owner": ["exact"],
            "source": ["exact"],
            "fy": ["exact"],
            "month": ["exact"],
            "zone": ["exact"],
        }

    def filter_date_range(self, queryset, name, value):
        date_mode = self.data.get("date_mode") or "enquiry"
        date_field = "close_date" if date_mode == "close" else "enquiry_date"
        if name == "start_date" and value:
            queryset = queryset.filter(**{f"{date_field}__gte": value})
        if name == "end_date" and value:
            queryset = queryset.filter(**{f"{date_field}__lte": value})
        return queryset

    def filter_date_mode(self, queryset, name, value):
        # the date mode is consumed inside filter_date_range, so no-op for base filter
        return queryset

    def filter_high_value(self, queryset, name, value):
        if value:
            queryset = queryset.filter(order_value__gte=settings.CRM_HIGH_VALUE_THRESHOLD)
        return queryset

    def filter_followup_due(self, queryset, name, value):
        if value:
            today = timezone.now().date()
            queryset = queryset.filter(
                lead_status="Open",
                next_followup_date__isnull=False,
                next_followup_date__lte=today,
            )
        return queryset


def filter_queryset(request):
    queryset = Lead.objects.all()
    filterset = LeadFilter(data=request.query_params, queryset=queryset, request=request)
    if not filterset.is_valid():
        raise ValidationError(filterset.errors)
    return filterset.qs

