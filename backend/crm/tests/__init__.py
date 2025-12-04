"""
Unit tests for CRM models.
"""
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import date, timedelta

from crm.models import Lead, ActivityLog


class LeadModelTests(TestCase):
    """Test cases for Lead model"""
    
    def setUp(self):
        """Create test leads"""
        self.lead = Lead.objects.create(
            enquiry_id="TEST001",
            dealer="Test Dealer",
            lead_status="Open",
            enquiry_date=timezone.now().date(),
            order_value=500000
        )
        
        self.closed_lead = Lead.objects.create(
            enquiry_id="TEST002",
            dealer="Test Dealer 2",
            lead_status="Closed",
            enquiry_date=date.today() - timedelta(days=30),
            close_date=date.today() - timedelta(days=5),
            win_flag=True,
            order_value=2000000
        )
    
    def test_lead_creation(self):
        """Test lead is created correctly"""
        self.assertEqual(self.lead.enquiry_id, "TEST001")
        self.assertEqual(self.lead.dealer, "Test Dealer")
        self.assertEqual(self.lead.lead_status, "Open")
    
    def test_lead_string_representation(self):
        """Test __str__ method returns enquiry_id"""
        self.assertEqual(str(self.lead), "TEST001")
    
    def test_lead_age_calculation_for_open_lead(self):
        """Test lead_age_days calculated correctly for open leads"""
        age = self.lead.lead_age_days
        self.assertIsNotNone(age)
        self.assertGreaterEqual(age, 0)
        self.assertIsInstance(age, int)
    
    def test_lead_age_none_for_closed_lead(self):
        """Test lead_age_days returns None for closed leads"""
        self.assertIsNone(self.closed_lead.lead_age_days)
    
    def test_lead_age_none_without_enquiry_date(self):
        """Test lead_age_days returns None if no enquiry_date"""
        lead = Lead.objects.create(
            enquiry_id="TEST003",
            dealer="Test",
            lead_status="Open"
        )
        self.assertIsNone(lead.lead_age_days)
    
    def test_close_time_calculation(self):
        """Test close_time_days calculated correctly"""
        close_time = self.closed_lead.close_time_days
        self.assertIsNotNone(close_time)
        self.assertEqual(close_time, 25)  # 30 days - 5 days
    
    def test_close_time_none_without_dates(self):
        """Test close_time_days returns None without both dates"""
        self.assertIsNone(self.lead.close_time_days)
    
    def test_is_high_value_true(self):
        """Test is_high_value returns True for high value leads"""
        self.assertTrue(self.closed_lead.is_high_value)
    
    def test_is_high_value_false(self):
        """Test is_high_value returns False for low value leads"""
        self.assertFalse(self.lead.is_high_value)
    
    def test_unique_enquiry_id(self):
        """Test enquiry_id must be unique"""
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Lead.objects.create(
                enquiry_id="TEST001",  # Duplicate
                dealer="Another Dealer"
            )
    
    def test_default_values(self):
        """Test default values are set correctly"""
        lead = Lead.objects.create(
            enquiry_id="TEST004",
            dealer="Test Dealer"
        )
        self.assertEqual(lead.quantity, 1)
        self.assertEqual(lead.order_value, 0)
        self.assertFalse(lead.win_flag)
        self.assertFalse(lead.finance_required)
        self.assertEqual(lead.followup_count, 0)


class ActivityLogTests(TestCase):
    """Test cases for ActivityLog model"""
    
    def setUp(self):
        """Create test user and activity log"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.activity = ActivityLog.objects.create(
            user=self.user,
            action='login',
            description='User logged in',
            ip_address='192.168.1.1'
        )
    
    def test_activity_log_creation(self):
        """Test activity log is created correctly"""
        self.assertEqual(self.activity.user, self.user)
        self.assertEqual(self.activity.action, 'login')
        self.assertEqual(self.activity.description, 'User logged in')
    
    def test_activity_log_string_representation(self):
        """Test __str__ method"""
        str_repr = str(self.activity)
        self.assertIn('testuser', str_repr)
        self.assertIn('User Login', str_repr)
    
    def test_activity_log_timestamp_auto_created(self):
        """Test timestamp is automatically set"""
        self.assertIsNotNone(self.activity.timestamp)
    
    def test_activity_log_metadata_default(self):
        """Test metadata defaults to empty dict"""
        self.assertEqual(self.activity.metadata, {})
    
    def test_activity_log_with_metadata(self):
        """Test activity log with metadata"""
        activity = ActivityLog.objects.create(
            user=self.user,
            action='create_lead',
            description='Created new lead',
            metadata={'lead_id': 123, 'enquiry_id': 'TEST001'}
        )
        self.assertEqual(activity.metadata['lead_id'], 123)
        self.assertEqual(activity.metadata['enquiry_id'], 'TEST001')
    
    def test_activity_log_ordering(self):
        """Test activity logs are ordered by timestamp descending"""
        activity2 = ActivityLog.objects.create(
            user=self.user,
            action='logout',
            description='User logged out'
        )
        
        logs = ActivityLog.objects.all()
        self.assertEqual(logs[0], activity2)  # Most recent first
        self.assertEqual(logs[1], self.activity)
    
    def test_delete_user_cascades_to_logs(self):
        """Test deleting user deletes associated activity logs"""
        log_id = self.activity.id
        self.user.delete()
        
        with self.assertRaises(ActivityLog.DoesNotExist):
            ActivityLog.objects.get(id=log_id)
