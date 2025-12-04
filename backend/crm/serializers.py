from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Lead, ActivityLog


class LeadSerializer(serializers.ModelSerializer):
    lead_age_days = serializers.SerializerMethodField()
    close_time_days = serializers.SerializerMethodField()
    is_high_value = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "enquiry_id",
            "enquiry_date",
            "close_date",
            "lead_stage",
            "lead_status",
            "enquiry_type",
            "dealer",
            "corporate_name",
            "address",
            "area_office",
            "branch",
            "customer_type",
            "dg_ownership",
            "district",
            "state",
            "city",
            "tehsil",
            "zone",
            "segment",
            "sub_segment",
            "kva",
            "kva_range",
            "quantity",
            "owner",
            "owner_code",
            "owner_status",
            "email",
            "phone_number",
            "pan_number",
            "phase",
            "pincode",
            "location",
            "source",
            "source_from",
            "events",
            "finance_company",
            "finance_required",
            "order_value",
            "win_flag",
            "loss_reason",
            "followup_count",
            "last_followup_date",
            "next_followup_date",
            "remarks",
            "fy",
            "month",
            "week",
            "created_by",
            "uploaded_by",
            "referred_by",
            "updated_at",
            "lead_age_days",
            "close_time_days",
            "is_high_value",
        ]

    def get_lead_age_days(self, obj: Lead):
        return obj.lead_age_days

    def get_close_time_days(self, obj: Lead):
        return obj.close_time_days

    def get_is_high_value(self, obj: Lead):
        return obj.is_high_value


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user management in admin panel"""
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'is_active', 'is_staff', 'date_joined', 'last_login', 'password']
        read_only_fields = ['date_joined', 'last_login']
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({"password": "Password is required for new users"})
            
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for activity logs"""
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'username', 'user_email', 'action', 
                  'action_display', 'description', 'ip_address', 'timestamp', 'metadata']
        read_only_fields = ['timestamp']
