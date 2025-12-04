from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ActivityLog, Lead
from .serializers import ActivityLogSerializer, UserSerializer


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_activity(user, action, description='', request=None, metadata=None):
    """Helper function to log user activity"""
    # Log for all users including admin
    # if user.is_superuser:
    #     return
    
    ActivityLog.objects.create(
        user=user,
        action=action,
        description=description,
        ip_address=get_client_ip(request) if request else None,
        metadata=metadata or {}
    )


class UserManagementViewSet(viewsets.ModelViewSet):
    """Admin-only viewset for managing users"""
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        # Allow admins to view all users
        return User.objects.all().order_by('-date_joined')
    
    def perform_create(self, serializer):
        user = serializer.save()
        log_activity(
            self.request.user,
            'create_user',
            f'Created user: {user.username}',
            self.request,
            {'user_id': user.id, 'username': user.username}
        )
    
    def perform_update(self, serializer):
        user = serializer.save()
        log_activity(
            self.request.user,
            'update_user',
            f'Updated user: {user.username}',
            self.request,
            {'user_id': user.id, 'username': user.username}
        )
    
    def perform_destroy(self, instance):
        log_activity(
            self.request.user,
            'delete_user',
            f'Deleted user: {instance.username}',
            self.request,
            {'user_id': instance.id, 'username': instance.username}
        )
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password"""
        user = self.get_object()
        new_password = request.data.get('password')
        
        if not new_password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        log_activity(
            request.user,
            'reset_password',
            f'Reset password for user: {user.username}',
            request,
            {'user_id': user.id, 'username': user.username}
        )
        
        return Response({'message': 'Password reset successfully'})


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only viewset for viewing activity logs"""
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = ActivityLog.objects.select_related('user')
        
        # Filters
        user_id = self.request.query_params.get('user_id')
        action = self.request.query_params.get('action')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if action:
            queryset = queryset.filter(action=action)
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset


class BulkDeleteLeadsView(APIView):
    """Admin-only view for bulk deleting leads"""
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        lead_ids = request.data.get('lead_ids', [])
        
        if not lead_ids:
            return Response(
                {'error': 'No lead IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get leads before deletion for logging
        leads_to_delete = Lead.objects.filter(id__in=lead_ids)
        deleted_count = leads_to_delete.count()
        
        # Delete leads
        leads_to_delete.delete()
        
        # Log this action for admin user
        ActivityLog.objects.create(
            user=request.user,
            action='bulk_delete_leads',
            description=f'Bulk deleted {deleted_count} leads',
            ip_address=get_client_ip(request),
            metadata={
                'deleted_count': deleted_count,
                'lead_ids': lead_ids
            }
        )
        
        return Response({
            'message': f'Successfully deleted {deleted_count} leads',
            'deleted_count': deleted_count
        })


class AdminStatsView(APIView):
    """Admin-only view for getting admin dashboard statistics"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # User statistics
        total_users = User.objects.filter(is_superuser=False).count()
        active_users = User.objects.filter(is_superuser=False, is_active=True).count()
        
        # Lead statistics
        total_leads = Lead.objects.count()
        leads_by_status = Lead.objects.values('lead_status').annotate(
            count=Count('id')
        )
        leads_by_owner = Lead.objects.values('owner').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Activity statistics
        recent_activities = ActivityLog.objects.count()
        activities_by_action = ActivityLog.objects.values('action').annotate(
            count=Count('id')
        )
        
        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'inactive': total_users - active_users
            },
            'leads': {
                'total': total_leads,
                'by_status': list(leads_by_status),
                'by_owner': list(leads_by_owner)
            },
            'activities': {
                'total': recent_activities,
                'by_action': list(activities_by_action)
            }
        })
