from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = (
        "enquiry_id",
        "dealer",
        "lead_stage",
        "lead_status",
        "order_value",
        "owner",
        "updated_at",
    )
    search_fields = ("enquiry_id", "dealer", "owner", "state", "city")
    list_filter = ("lead_status", "lead_stage", "state", "segment", "owner")
