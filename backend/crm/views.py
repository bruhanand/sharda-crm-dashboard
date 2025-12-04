from datetime import date, datetime
from decimal import Decimal

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import LeadFilter, filter_queryset
from .import_utils import load_records_from_file, map_row, serialize_for_preview
from .models import Lead
from .pagination import StandardResultsSetPagination
from .serializers import LeadSerializer
from .services import build_chart_payload, build_forecast, build_insights, compute_kpis
from .admin_views import log_activity

# File upload configuration
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls']
ALLOWED_CONTENT_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    filterset_class = LeadFilter
    ordering_fields = ["updated_at", "order_value", "followup_count", "kva"]
    search_fields = ["enquiry_id", "dealer", "owner", "state", "city", "segment"]
    pagination_class = StandardResultsSetPagination
    http_method_names = ["get", "patch", "put", "head", "options"]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_activity(
            self.request.user,
            'create_lead',
            f'Created lead: {instance.enquiry_id}',
            self.request,
            {'lead_id': instance.id, 'enquiry_id': instance.enquiry_id}
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        # Capture old values for fields being updated
        old_values = {}
        for field in serializer.validated_data.keys():
            if hasattr(instance, field):
                old_values[field] = getattr(instance, field)
        
        updated_instance = serializer.save()
        
        changes = []
        for field, new_value in serializer.validated_data.items():
            old_value = old_values.get(field)
            # Simple comparison, can be improved for complex types
            if old_value != new_value:
                changes.append(f"{field}: '{old_value}' -> '{new_value}'")
        
        if changes:
            description = f"Updated lead {updated_instance.enquiry_id}: " + ", ".join(changes)
            # Truncate description if too long
            if len(description) > 250:
                description = description[:247] + "..."
                
            log_activity(
                self.request.user,
                'update_lead',
                description,
                self.request,
                {'lead_id': updated_instance.id, 'enquiry_id': updated_instance.enquiry_id, 'changes': changes}
            )

    def perform_destroy(self, instance):
        enquiry_id = instance.enquiry_id
        lead_id = instance.id
        instance.delete()
        log_activity(
            self.request.user,
            'delete_lead',
            f'Deleted lead: {enquiry_id}',
            self.request,
            {'lead_id': lead_id, 'enquiry_id': enquiry_id}
        )


class KpiView(APIView):
    def get(self, request):
        queryset = filter_queryset(request)
        return Response(compute_kpis(queryset))


class ChartsView(APIView):
    def get(self, request):
        queryset = filter_queryset(request)
        return Response(build_chart_payload(queryset))


class ForecastView(APIView):
    def get(self, request):
        queryset = filter_queryset(request)
        return Response(build_forecast(queryset))


class InsightsView(APIView):
    def get(self, request):
        queryset = filter_queryset(request)
        return Response(build_insights(queryset))


class LeadUploadPreviewView(APIView):
    """
    Preview uploaded leads file before importing.
    RATE LIMITED: 10 uploads per hour per user to prevent abuse.
    """
    parser_classes = (MultiPartParser, FormParser)
    
    @method_decorator(ratelimit(key='user', rate='10/h', method='POST'))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size
        if uploaded_file.size > MAX_UPLOAD_SIZE:
            return Response(
                {"detail": f"File size exceeds maximum allowed size of {MAX_UPLOAD_SIZE / (1024*1024):.0f}MB"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        file_ext = uploaded_file.name.lower().split('.')[-1] if '.' in uploaded_file.name else ''
        if f'.{file_ext}' not in ALLOWED_EXTENSIONS:
            return Response(
                {"detail": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate content type
        if uploaded_file.content_type not in ALLOWED_CONTENT_TYPES:
            return Response(
                {"detail": f"Invalid content type: {uploaded_file.content_type}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            records = load_records_from_file(uploaded_file)
        except ValueError as exc:
            return Response({"detail": f"Invalid file format: {str(exc)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({"detail": f"Error processing file: {str(exc)}"}, status=status.HTTP_400_BAD_REQUEST)

        updated = []
        new_candidates = []
        errors = []
        
        for idx, row in enumerate(records):
            try:
                mapped = map_row(row)
                enquiry_id = mapped.get("enquiry_id")
                if not enquiry_id:
                    errors.append(f"Row {idx + 1}: Missing enquiry_id")
                    continue
                    
                lead = Lead.objects.filter(enquiry_id=enquiry_id).first()
                if lead:
                    changes = {}
                    for field, value in mapped.items():
                        old_value = getattr(lead, field)
                        if old_value != value:
                            changes[field] = {
                                "from": _serialize_value(old_value),
                                "to": _serialize_value(value),
                            }
                    if changes:
                        updated.append({
                            "enquiry_id": lead.enquiry_id,
                            "dealer": lead.dealer,
                            "changes": changes,
                        })
                else:
                    new_candidates.append(serialize_for_preview(mapped, row))
            except Exception as exc:
                errors.append(f"Row {idx + 1}: {str(exc)}")
        
        # Log upload activity
        log_activity(
            request.user,
            'upload_file',
            f'Previewed upload file: {uploaded_file.name} ({len(records)} records)',
            request,
            {
                'filename': uploaded_file.name,
                'total_records': len(records),
                'updated': len(updated),
                'new': len(new_candidates),
                'errors': len(errors)
            }
        )

        return Response(
            {
                "updated_count": len(updated),
                "new_candidates": new_candidates,
                "updated_preview": updated[:15],
                "errors": errors[:10] if errors else [],  # Limit error messages
                "total_errors": len(errors),
                "total_records": len(records)
            }
        )


class LeadUploadCreateView(APIView):
    """
    Create leads from uploaded file data.
    SECURITY: Uses serializer validation to prevent SQL injection.
    PERFORMANCE: Batch-loads existing leads to prevent N+1 queries.
    RATE LIMITED: 10 create operations per hour per user.
    """
    
    @method_decorator(ratelimit(key='user', rate='10/h', method='POST'))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    def post(self, request):
        rows = request.data.get("rows", [])
        if not isinstance(rows, list):
            return Response({"detail": "rows must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        if len(rows) > 1000:
            return Response(
                {"detail": "Maximum 1000 rows per upload"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract enquiry_ids and batch-load existing leads (FIX: N+1 query)
        enquiry_ids = []
        for raw in rows:
            try:
                mapped = map_row(raw)
                enquiry_id = mapped.get("enquiry_id")
                if enquiry_id:
                    enquiry_ids.append(enquiry_id)
            except Exception:
                continue
        
        # Batch load existing leads in one query
        existing_leads = {
            lead.enquiry_id: lead 
            for lead in Lead.objects.filter(enquiry_id__in=enquiry_ids)
        }

        created = 0
        updated = 0
        errors = []
        
        for idx, raw in enumerate(rows):
            try:
                mapped = map_row(raw)
                enquiry_id = mapped.get("enquiry_id")
                
                if not enquiry_id:
                    errors.append(f"Row {idx + 1}: Missing enquiry_id")
                    continue
                
                # SECURITY FIX: Validate data using serializer
                existing_lead = existing_leads.get(enquiry_id)
                
                if existing_lead:
                    # Update existing lead
                    serializer = LeadSerializer(existing_lead, data=mapped, partial=True)
                else:
                    # Create new lead
                    serializer = LeadSerializer(data=mapped)
                
                if serializer.is_valid():
                    serializer.save()
                    if existing_lead:
                        updated += 1
                    else:
                        created += 1
                else:
                    error_msg = f"Row {idx + 1}: " + str(serializer.errors)
                    errors.append(error_msg[:200])  # Limit error length
                    
            except Exception as exc:
                errors.append(f"Row {idx + 1}: {str(exc)[:100]}")

        # Log bulk creation
        log_activity(
            request.user,
            'bulk_create_leads',
            f'Bulk created {created} and updated {updated} leads',
            request,
            {'created': created, 'updated': updated, 'errors': len(errors)}
        )

        return Response({
            "created": created,
            "updated": updated,
            "errors": errors[:10] if errors else [],  # Limit errors returned
            "total_errors": len(errors)
        })


def _serialize_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring and load balancer checks.
    Returns database connectivity status and application version.
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        """GET /api/health/ - Returns health status"""
        import django
        from django.db import connection
        from django.utils import timezone
        
        health_data = {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'django_version': django.get_version(),
            'database': 'disconnected',
        }
        
        # Check database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                health_data['database'] = 'connected'
        except Exception as e:
            health_data['status'] = 'unhealthy'
            health_data['database'] = f'error: {str(e)}'
            return Response(health_data, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        return Response(health_data, status=status.HTTP_200_OK)
