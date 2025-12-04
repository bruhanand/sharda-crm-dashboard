"""
Integration tests for CRM API endpoints.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from crm.models import Lead


class LeadAPITests(TestCase):
    """Test cases for Lead API endpoints"""
    
    def setUp(self):
        """Create test user and authenticate"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # Create test leads
        self.lead1 = Lead.objects.create(
            enquiry_id="API001",
            dealer="Test Dealer 1",
            lead_status="Open",
            order_value=500000
        )
        self.lead2 = Lead.objects.create(
            enquiry_id="API002",
            dealer="Test Dealer 2",
            lead_status="Closed",
            win_flag=True,
            order_value=1500000
        )
    
    def test_list_leads_authenticated(self):
        """Test authenticated user can list leads"""
        response = self.client.get('/api/leads/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_list_leads_unauthenticated(self):
        """Test unauthenticated user cannot list leads"""
        self.client.credentials()  # Remove authentication
        response = self.client.get('/api/leads/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_retrieve_lead(self):
        """Test retrieving a specific lead"""
        response = self.client.get(f'/api/leads/{self.lead1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['enquiry_id'], "API001")
    
    def test_update_lead(self):
        """Test updating a lead"""
        data = {'remarks': 'Updated remarks', 'followup_count': 5}
        response = self.client.patch(f'/api/leads/{self.lead1.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.lead1.refresh_from_db()
        self.assertEqual(self.lead1.remarks, 'Updated remarks')
        self.assertEqual(self.lead1.followup_count, 5)
    
    def test_filter_leads_by_status(self):
        """Test filtering leads by status"""
        response = self.client.get('/api/leads/', {'lead_status': 'Open'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(all(lead['lead_status'] == 'Open' for lead in results))
    
    def test_search_leads(self):
        """Test searching leads"""
        response = self.client.get('/api/leads/', {'search': 'API001'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(any(lead['enquiry_id'] == 'API001' for lead in results))


class KPIAPITests(TestCase):
    """Test cases for KPI endpoint"""
    
    def setUp(self):
        """Create test user and authenticate"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # Create test data
        Lead.objects.create(
            enquiry_id="KPI001",
            dealer="Dealer 1",
            lead_status="Open",
            order_value=500000
        )
        Lead.objects.create(
            enquiry_id="KPI002",
            dealer="Dealer 2",
            lead_status="Closed",
            win_flag=True,
            order_value=2000000
        )
    
    def test_kpi_endpoint_structure(self):
        """Test KPI endpoint returns correct structure"""
        response = self.client.get('/api/kpi/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify required fields
        required_fields = [
            'total_leads', 'open_leads', 'closed_leads', 
            'won_leads', 'conversion_rate', 'pipeline_value', 'won_value'
        ]
        for field in required_fields:
            self.assertIn(field, response.data, f"Missing field: {field}")
    
    def test_kpi_calculations(self):
        """Test KPI calculations are correct"""
        response = self.client.get('/api/kpi/')
        self.assertEqual(response.data['total_leads'], 2)
        self.assertEqual(response.data['open_leads'], 1)
        self.assertEqual(response.data['closed_leads'], 1)
        self.assertEqual(response.data['won_leads'], 1)
        self.assertEqual(response.data['won_value'], 2000000)


class HealthCheckAPITests(TestCase):
    """Test cases for health check endpoint"""
    
    def test_health_check_public(self):
        """Test health check endpoint is public"""
        client = APIClient()
        response = client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_health_check_structure(self):
        """Test health check returns expected fields"""
        client = APIClient()
        response = client.get('/api/health/')
        
        self.assertIn('status', response.data)
        self.assertIn('database', response.data)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertEqual(response.data['database'], 'connected')
