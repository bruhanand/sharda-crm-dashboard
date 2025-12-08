"""
Forecast Service - Predict Analytics for CRM
Generates forecasts for leads, conversion rates, and other metrics using ML models
"""
from django.db.models import Count, Avg, Sum, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict
import statistics

# Import ML forecast service
try:
    from .ml_forecast_service import ml_forecast_leads, ml_forecast_conversion
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


def calculate_lead_forecast(queryset, months=6):
    """
    Generate forecasted lead counts for next N months using ML models
    """
    if ML_AVAILABLE:
        try:
            result = ml_forecast_leads(queryset, months)
            return result['forecast']
        except Exception as e:
            print(f"ML forecast failed, using fallback: {e}")
    
    # Fallback: simple linear regression
    twelve_months_ago = timezone.now().date() - timedelta(days=365)
    
    monthly_data = list(
        queryset.filter(enquiry_date__gte=twelve_months_ago)
        .annotate(month_truncated=TruncMonth('enquiry_date'))
        .values('month_truncated')
        .annotate(count=Count('id'))
        .order_by('month_truncated')
    )
    
    if len(monthly_data) < 2:
        return []
    
    # Simple linear trend calculation
    counts = [item['count'] for item in monthly_data]
    avg_growth = (counts[-1] - counts[0]) / len(counts) if len(counts) > 0 else 0
    last_count = counts[-1] if counts else 0
    
    # Generate forecast for next N months
    forecast = []
    current_date = timezone.now().date()
    
    for i in range(1, months + 1):
        future_month = current_date + timedelta(days=30 * i)
        forecasted_count = max(0, int(last_count + (avg_growth * i)))
        
        forecast.append({
            'month': future_month.strftime('%Y-%m'),
            'forecasted_leads': forecasted_count,
            'trend': 'increasing' if avg_growth > 0 else 'decreasing' if avg_growth < 0 else 'stable',
            'model': 'Linear Regression',
            'confidence': 'low'
        })
    
    return forecast




def calculate_conversion_forecast(queryset, months=6):
    """
    Project conversion rates for next N months using ML models
    """
    if ML_AVAILABLE:
        try:
            result = ml_forecast_conversion(queryset, months)
            return result['forecast']
        except Exception as e:
            print(f"ML conversion forecast failed, using fallback: {e}")
    
    # Fallback: average-based projection
    # Get monthly conversion rates for past 12 months
    twelve_months_ago = timezone.now().date() - timedelta(days=365)
    
    monthly_conversions = list(
        queryset.filter(enquiry_date__gte=twelve_months_ago)
        .annotate(month_truncated=TruncMonth('enquiry_date'))
        .values('month_truncated')
        .annotate(
            total=Count('id'),
            won=Count('id', filter=(
                Q(lead_stage__iexact='Closed-Won') | 
                Q(lead_stage__iexact='Order Booked')
            ))
        )
        .order_by('month_truncated')
    )
    
    # Calculate conversion rates
    conversion_rates = []
    for item in monthly_conversions:
        if item['total'] > 0:
            rate = (item['won'] / item['total']) * 100
            conversion_rates.append(rate)
    
    if not conversion_rates:
        avg_conversion = 0
    else:
        avg_conversion = statistics.mean(conversion_rates)
    
    # Simple forecast: use average with slight trend
    trend = 0
    if len(conversion_rates) >= 2:
        trend = (conversion_rates[-1] - conversion_rates[0]) / len(conversion_rates)
    
    forecast = []
    current_date = timezone.now().date()
    
    for i in range(1, months + 1):
        future_month = current_date + timedelta(days=30 * i)
        forecasted_rate = min(100, max(0, avg_conversion + (trend * i)))
        
        forecast.append({
            'month': future_month.strftime('%Y-%m'),
            'forecasted_conversion': round(forecasted_rate, 1),
            'confidence': 'medium' if len(conversion_rates) >= 6 else 'low',
            'model': 'Average-Based'
        })
    
    return forecast


def forecast_by_dealer(queryset, months=3):
    """
    Expected monthly wins by dealer
    Based on historical win rates and lead volume
    """
    # Get dealer performance over past 6 months
    six_months_ago = timezone.now().date() - timedelta(days=180)
    
    dealer_stats = list(
        queryset.filter(enquiry_date__gte=six_months_ago)
        .values('dealer')
        .annotate(
            total_leads=Count('id'),
            won_leads=Count('id', filter=(
                Q(lead_stage__iexact='Closed-Won') | 
                Q(lead_stage__iexact='Order Booked')
            )),
            avg_order_value=Avg('order_value', filter=(
                Q(lead_stage__iexact='Closed-Won') | 
                Q(lead_stage__iexact='Order Booked')
            ))
        )
        .order_by('-won_leads')[:15]  # Top 15 dealers
    )
    
    forecast_data = []
    for dealer in dealer_stats:
        if dealer['total_leads'] > 0:
            win_rate = dealer['won_leads'] / dealer['total_leads']
            avg_monthly_leads = dealer['total_leads'] / 6  # 6 months of data
            
            # Project monthly wins
            expected_monthly_wins = int(avg_monthly_leads * win_rate)
            expected_value = float(dealer['avg_order_value'] or 0) * expected_monthly_wins
            
            forecast_data.append({
                'dealer': dealer['dealer'],
                'expected_monthly_wins': expected_monthly_wins,
                'expected_monthly_value': round(expected_value, 2),
                'win_rate': round(win_rate * 100, 1)
            })
    
    return forecast_data


def forecast_by_location(queryset):
    """
    Heatmap data of expected leads by state
    """
    # Get state-level data for past 6 months
    six_months_ago = timezone.now().date() - timedelta(days=180)
    
    location_stats = list(
        queryset.filter(enquiry_date__gte=six_months_ago)
        .exclude(state__isnull=True)
        .exclude(state='')
        .values('state')
        .annotate(
            total_leads=Count('id'),
            won_leads=Count('id', filter=(
                Q(lead_stage__iexact='Closed-Won') | 
                Q(lead_stage__iexact='Order Booked')
            ))
        )
        .order_by('-total_leads')
    )
    
    forecast_data = []
    for state in location_stats:
        avg_monthly_leads = state['total_leads'] / 6
        win_rate = (state['won_leads'] / state['total_leads']) if state['total_leads'] > 0 else 0
        
        forecast_data.append({
            'state': state['state'],
            'expected_monthly_leads': int(avg_monthly_leads),
            'expected_monthly_wins': int(avg_monthly_leads * win_rate),
            'intensity': min(100, int((avg_monthly_leads / max(1, max(s['total_leads'] for s in location_stats) / 6)) * 100))
        })
    
    return forecast_data


def forecast_by_kva_range(queryset, months=6):
    """
    Stacked bar projection by KVA range
    """
    # Get KVA range distribution over past 12 months
    twelve_months_ago = timezone.now().date() - timedelta(days=365)
    
    kva_data = list(
        queryset.filter(enquiry_date__gte=twelve_months_ago)
        .exclude(kva_range__isnull=True)
        .exclude(kva_range='')
        .annotate(month_truncated=TruncMonth('enquiry_date'))
        .values('month_truncated', 'kva_range')
        .annotate(count=Count('id'))
        .order_by('month_truncated', 'kva_range')
    )
    
    # Build monthly distribution
    monthly_distribution = defaultdict(lambda: defaultdict(int))
    kva_ranges = set()
    
    for item in kva_data:
        month_key = item['month_truncated'].strftime('%Y-%m') if item['month_truncated'] else 'Unknown'
        kva_range = item['kva_range']
        monthly_distribution[month_key][kva_range] = item['count']
        kva_ranges.add(kva_range)
    
    # Calculate average monthly distribution per KVA range
    avg_distribution = {}
    for kva in kva_ranges:
        counts = [monthly_distribution[month][kva] for month in monthly_distribution]
        avg_distribution[kva] = sum(counts) / len(counts) if counts else 0
    
    # Generate forecast
    forecast = []
    current_date = timezone.now().date()
    
    for i in range(1, months + 1):
        future_month = current_date + timedelta(days=30 * i)
        month_forecast = {
            'month': future_month.strftime('%Y-%m'),
        }
        
        # Add forecasted count for each KVA range
        for kva, avg_count in avg_distribution.items():
            month_forecast[kva] = int(avg_count)
        
        forecast.append(month_forecast)
    
    return {
        'forecast': forecast,
        'kva_ranges': sorted(list(kva_ranges))
    }
