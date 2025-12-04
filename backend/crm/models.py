from django.conf import settings
from django.db import models
from django.utils import timezone


class Lead(models.Model):
    enquiry_id = models.CharField(max_length=32, unique=True)
    enquiry_date = models.DateField(null=True, blank=True)
    close_date = models.DateField(null=True, blank=True)
    lead_stage = models.CharField(max_length=64, blank=True)
    lead_status = models.CharField(max_length=32, blank=True)
    enquiry_type = models.CharField(max_length=64, blank=True)
    dealer = models.CharField(max_length=128)
    corporate_name = models.CharField(max_length=128, blank=True)
    address = models.TextField(blank=True)
    area_office = models.CharField(max_length=128, blank=True)
    branch = models.CharField(max_length=128, blank=True)
    customer_type = models.CharField(max_length=64, blank=True)
    dg_ownership = models.CharField(max_length=64, blank=True)
    district = models.CharField(max_length=64, blank=True)
    state = models.CharField(max_length=64, blank=True)
    city = models.CharField(max_length=128, blank=True)
    tehsil = models.CharField(max_length=64, blank=True)
    zone = models.CharField(max_length=32, blank=True)
    segment = models.CharField(max_length=64, blank=True)
    sub_segment = models.CharField(max_length=64, blank=True)
    source = models.CharField(max_length=64, blank=True)
    source_from = models.CharField(max_length=64, blank=True)
    events = models.CharField(max_length=128, blank=True)
    finance_company = models.CharField(max_length=128, blank=True)
    finance_required = models.BooleanField(default=False)
    owner = models.CharField(max_length=64, blank=True, db_index=True)
    owner_code = models.CharField(max_length=64, blank=True)
    owner_status = models.CharField(max_length=32, blank=True)
    email = models.EmailField(max_length=128, blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    pan_number = models.CharField(max_length=32, blank=True)
    phase = models.CharField(max_length=32, blank=True)
    pincode = models.CharField(max_length=16, blank=True)
    location = models.CharField(max_length=128, blank=True)
    kva = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True)
    kva_range = models.CharField(max_length=32, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    order_value = models.DecimalField(
        max_digits=14, decimal_places=2, default=0)
    win_flag = models.BooleanField(default=False)
    loss_reason = models.CharField(max_length=255, blank=True)
    remarks = models.TextField(blank=True)
    followup_count = models.PositiveSmallIntegerField(default=0)
    last_followup_date = models.DateField(null=True, blank=True)
    next_followup_date = models.DateField(null=True, blank=True)
    referred_by = models.CharField(max_length=128, blank=True)
    uploaded_by = models.CharField(max_length=64, blank=True)
    created_by = models.CharField(max_length=64, blank=True)
    updated_at = models.DateTimeField(default=timezone.now)
    fy = models.CharField(max_length=8, blank=True)
    month = models.CharField(max_length=8, blank=True)
    week = models.CharField(max_length=8, blank=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [
            models.Index(fields=['-updated_at']),
            models.Index(fields=['enquiry_date']),
            models.Index(fields=['close_date']),
            models.Index(fields=['lead_status']),
            models.Index(fields=['dealer']),
            models.Index(fields=['owner']),
            models.Index(fields=['state']),
            models.Index(fields=['enquiry_id']),  # Already unique, but explicit index
        ]

    def __str__(self) -> str:
        return self.enquiry_id

    @property
    def lead_age_days(self) -> int | None:
        if (self.lead_status or "").lower() != "open" or not self.enquiry_date:
            return None
        today = timezone.now().date()
        return max((today - self.enquiry_date).days, 0)

    @property
    def close_time_days(self) -> int | None:
        if not (self.enquiry_date and self.close_date):
            return None
        return max((self.close_date - self.enquiry_date).days, 0)

    @property
    def is_high_value(self) -> bool:
        threshold = getattr(settings, "CRM_HIGH_VALUE_THRESHOLD", 1_000_000)
        return self.order_value >= threshold


class ActivityLog(models.Model):
    """Track user activities for admin monitoring"""
    ACTION_CHOICES = [
        ('login', 'User Login'),
        ('logout', 'User Logout'),
        ('create_lead', 'Created Lead'),
        ('update_lead', 'Updated Lead'),
        ('delete_lead', 'Deleted Lead'),
        ('bulk_delete_leads', 'Bulk Deleted Leads'),
        ('bulk_create_leads', 'Bulk Created Leads'),
        ('upload_file', 'Uploaded File'),
        ('apply_filters', 'Applied Filters'),
        ('export_data', 'Exported Data'),
        ('view_page', 'Viewed Page'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)  # Additional context
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_action_display()} - {self.timestamp}"
