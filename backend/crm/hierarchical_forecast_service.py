"""
Hierarchical Forecast Service - Auto-Generated Complete Forecast Engine
Generates State → Dealer → Location forecasts plus Range & Sector forecasts
Optimized for 1 vCPU with limited grid search and timeouts
"""
from django.db.models import Count, Sum, Q, Avg, Min, Max
from django.db.models.functions import TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict
import pandas as pd
import numpy as np
import warnings
import signal
from contextlib import contextmanager

warnings.filterwarnings('ignore')

# Import SARIMA training from existing ML service
try:
    from .ml_forecast_service import train_sarima, calculate_mape
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


# 1 vCPU Optimization: Timeout for model training
MODEL_TIMEOUT_SECONDS = 30


@contextmanager
def timeout_context(seconds):
    """Context manager for timeout on model training"""
    # Note: signal.alarm is Unix-only, skip timeout on Windows
    import platform
    if platform.system() == 'Windows':
        yield
        return
    
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Model training exceeded {seconds} seconds")
    
    # Set signal handler
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


def train_sarima_optimized(data, forecast_periods=12, seasonal_periods=52):
    """
    Optimized SARIMA training for 1 vCPU - minimal grid search
    Uses only essential parameter combinations to reduce computation time
    """
    if not ML_AVAILABLE or data is None or len(data) < 12:
        return None
    
    try:
        # For 1 vCPU: Use minimal grid search (only 0,1 for all parameters)
        # This reduces from 64 combinations to 8 combinations
        best_aic = np.inf
        best_model = None
        best_order = (1, 1, 1)
        best_seasonal_order = (1, 1, 1, min(seasonal_periods, 52))
        
        # Minimal search space for 1 vCPU
        param_combinations = [
            ((1, 1, 1), (1, 1, 1, min(seasonal_periods, 52))),
            ((0, 1, 1), (0, 1, 1, min(seasonal_periods, 52))),
            ((1, 1, 0), (1, 1, 0, min(seasonal_periods, 52))),
            ((1, 0, 1), (1, 0, 1, min(seasonal_periods, 52))),
        ]
        
        for order, seasonal_order in param_combinations:
            try:
                with timeout_context(MODEL_TIMEOUT_SECONDS):
                    model = SARIMAX(
                        data['y'],
                        order=order,
                        seasonal_order=seasonal_order
                    )
                    fitted = model.fit(disp=False, maxiter=50)  # Limit iterations
                    
                    if fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_model = fitted
                        best_order = order
                        best_seasonal_order = seasonal_order
            except (TimeoutError, Exception):
                continue
        
        if best_model is None:
            return None
        
        forecast = best_model.forecast(steps=forecast_periods)
        
        # Calculate metrics
        fitted_values = best_model.fittedvalues
        mae = mean_absolute_error(data['y'], fitted_values)
        rmse = np.sqrt(mean_squared_error(data['y'], fitted_values))
        mape = calculate_mape(data['y'], fitted_values)
        
        return {
            'model_name': f'SARIMA{best_order}x{best_seasonal_order}',
            'forecast': forecast.tolist(),
            'metrics': {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape),
                'aic': float(best_aic)
            }
        }
    except Exception as e:
        print(f"SARIMA optimized error: {e}")
        return None


def prepare_weekly_time_series(queryset, group_by_field, date_field='enquiry_date', metric='both', weeks_back=52):
    """
    Prepare weekly time series data for forecasting
    Aggregates data by week and grouping field (state, dealer, location, etc.)
    Returns dictionary of DataFrames keyed by group value
    
    Note: Uses the queryset as-is if it already has date filters applied.
    Only applies default cutoff if queryset has no date filters.
    """
    # Check if queryset already has date filters by examining the query
    # If the queryset is already filtered by date, use it as-is
    # Otherwise, apply a reasonable default cutoff (52 weeks back)
    filtered_qs = queryset
    
    # Check if queryset already has date filters applied
    # If user provided start_date/end_date, use queryset as-is
    # Otherwise apply default cutoff for reasonable data range
    has_date_filter = False
    try:
        # Check query for existing date filters
        query_str = str(queryset.query).lower()
        date_field_lower = date_field.lower()
        if f'{date_field_lower}__gte' in query_str or f'{date_field_lower}__lte' in query_str or f'{date_field_lower}__range' in query_str:
            has_date_filter = True
            print(f"Date filter detected in queryset for {date_field}, using queryset as-is")
    except Exception as e:
        print(f"Error checking query: {e}")
    
    # Only apply default cutoff if no date filters exist
    if not has_date_filter:
        cutoff_date = timezone.now().date() - timedelta(weeks=weeks_back)
        filtered_qs = queryset.filter(**{f'{date_field}__gte': cutoff_date})
        print(f"No date filter found, applying default cutoff: {cutoff_date}")
    else:
        filtered_qs = queryset
        print(f"Using queryset with existing date filters, count: {queryset.count()}")
    
    # Get weekly aggregated data
    weekly_data = list(
        filtered_qs
        .annotate(week_truncated=TruncWeek(date_field))
        .values('week_truncated', group_by_field)
        .annotate(
            enquiry_count=Count('id'),
            order_value_sum=Sum('order_value', default=0)
        )
        .order_by('week_truncated', group_by_field)
    )
    
    print(f"prepare_weekly_time_series: Found {len(weekly_data)} weekly data points for {group_by_field}")
    
    if not weekly_data:
        print(f"Warning: No weekly data found for {group_by_field}. Queryset count: {filtered_qs.count()}")
        # Debug: Check what states/values exist
        if group_by_field == 'state':
            states = filtered_qs.values_list('state', flat=True).distinct().exclude(state__isnull=True).exclude(state='')
            print(f"Available {group_by_field} values: {list(states)[:10]}")
        return {}
    
    # Convert to DataFrame and group by group_by_field value
    # Aggregate by week and group to handle any duplicates
    time_series_dict = defaultdict(lambda: defaultdict(float))
    
    for item in weekly_data:
        group_value = item[group_by_field] or 'Unknown'
        week = item['week_truncated']
        
        if metric in ['enquiries', 'both']:
            time_series_dict[group_value][week] += item['enquiry_count']
        
        if metric in ['order_value', 'both']:
            time_series_dict[f'{group_value}_value'][week] += float(item['order_value_sum'] or 0)
    
    print(f"prepare_weekly_time_series: Grouped into {len(time_series_dict)} {group_by_field} groups")
    
    print(f"prepare_weekly_time_series: Grouped into {len(time_series_dict)} {group_by_field} groups")
    
    # Convert each group to DataFrame
    result = {}
    skipped_insufficient_data = 0
    for key, week_dict in time_series_dict.items():
        # Reduced minimum to 2 weeks for flexibility (can still forecast with less data)
        if len(week_dict) < 2:
            skipped_insufficient_data += 1
            print(f"Skipping {key}: only {len(week_dict)} weeks of data (need 2+)")
            continue
        
        # Convert to list of dicts
        data_list = [{'ds': week, 'y': value} for week, value in sorted(week_dict.items())]
        
        df = pd.DataFrame(data_list)
        df['ds'] = pd.to_datetime(df['ds'])
        df = df.set_index('ds').sort_index()
        df = df.resample('W').sum()  # Ensure weekly frequency
        
        # Accept data with at least 2 weeks (reduced from 4 for flexibility)
        if len(df) >= 2:
            result[key] = df
            print(f"Added {key} to result with {len(df)} weeks of data")
        else:
            skipped_insufficient_data += 1
            print(f"Skipping {key} after resampling: only {len(df)} weeks (need 2+)")
    
    print(f"prepare_weekly_time_series: Returning {len(result)} valid time series (skipped {skipped_insufficient_data} with insufficient data)")
    return result


def calculate_historical_proportions(queryset, parent_field, child_field, weeks_back=52, metric='both'):
    """
    Calculate historical proportions for proportional allocation
    Returns dictionary: {parent_value: {child_value: proportion}}
    """
    cutoff_date = timezone.now().date() - timedelta(weeks=weeks_back)
    
    filtered_qs = queryset.filter(**{'enquiry_date__gte': cutoff_date})
    
    # Aggregate by parent and child
    proportions = defaultdict(lambda: defaultdict(float))
    parent_totals = defaultdict(float)
    
    if metric in ['enquiries', 'both']:
        data = list(
            filtered_qs
            .values(parent_field, child_field)
            .annotate(count=Count('id'))
        )
        
        for item in data:
            parent = item[parent_field] or 'Unknown'
            child = item[child_field] or 'Unknown'
            count = item['count']
            
            proportions[parent][child] += count
            parent_totals[parent] += count
    
    if metric in ['order_value', 'both']:
        value_data = list(
            filtered_qs
            .values(parent_field, child_field)
            .annotate(total_value=Sum('order_value', default=0))
        )
        
        for item in value_data:
            parent = item[parent_field] or 'Unknown'
            child = item[child_field] or 'Unknown'
            value = float(item['total_value'] or 0)
            
            proportions[f'{parent}_value'][f'{child}_value'] += value
            parent_totals[f'{parent}_value'] += value
    
    # Normalize to proportions
    result = {}
    for parent, children_dict in proportions.items():
        parent_total = parent_totals.get(parent, 1)
        if parent_total > 0:
            result[parent] = {
                child: count / parent_total
                for child, count in children_dict.items()
            }
    
    return result


def reconcile_forecasts(parent_forecast, child_forecasts, metric='both'):
    """
    Reconcile child forecasts to sum to parent forecast
    Adjusts proportionally if there's a mismatch
    """
    if not parent_forecast or not child_forecasts:
        return child_forecasts
    
    reconciled = []
    
    if metric == 'enquiries':
        parent_total = sum([f['forecasted_enquiries'] for f in parent_forecast])
        child_total = sum([f['forecasted_enquiries'] for f in child_forecasts])
        
        if child_total > 0 and abs(parent_total - child_total) > 0.01:
            ratio = parent_total / child_total
            for child in child_forecasts:
                child['forecasted_enquiries'] = max(0, int(child['forecasted_enquiries'] * ratio))
                child['reconciled'] = True
    
    elif metric == 'order_value':
        parent_total = sum([f['forecasted_value'] for f in parent_forecast])
        child_total = sum([f['forecasted_value'] for f in child_forecasts])
        
        if child_total > 0 and abs(parent_total - child_total) > 0.01:
            ratio = parent_total / child_total
            for child in child_forecasts:
                child['forecasted_value'] = max(0, float(child['forecasted_value'] * ratio))
                child['reconciled'] = True
    
    else:  # both
        # Reconcile enquiries
        parent_enq_total = sum([f.get('forecasted_enquiries', 0) for f in parent_forecast])
        child_enq_total = sum([f.get('forecasted_enquiries', 0) for f in child_forecasts])
        
        if child_enq_total > 0 and abs(parent_enq_total - child_enq_total) > 0.01:
            ratio = parent_enq_total / child_enq_total
            for child in child_forecasts:
                if 'forecasted_enquiries' in child:
                    child['forecasted_enquiries'] = max(0, int(child['forecasted_enquiries'] * ratio))
                    child['reconciled'] = True
        
        # Reconcile order value
        parent_val_total = sum([f.get('forecasted_value', 0) for f in parent_forecast])
        child_val_total = sum([f.get('forecasted_value', 0) for f in child_forecasts])
        
        if child_val_total > 0 and abs(parent_val_total - child_val_total) > 0.01:
            ratio = parent_val_total / child_val_total
            for child in child_forecasts:
                if 'forecasted_value' in child:
                    child['forecasted_value'] = max(0, float(child['forecasted_value'] * ratio))
                    child['reconciled'] = True
    
    return child_forecasts


def forecast_state(queryset, horizon_weeks, metric='both'):
    """
    Forecast state-level demand
    Trains SARIMA model on weekly historical data aggregated by state
    """
    print(f"forecast_state: Starting with queryset count: {queryset.count()}")
    time_series_data = prepare_weekly_time_series(queryset, 'state', metric=metric)
    
    print(f"forecast_state: Got {len(time_series_data)} states with time series data")
    if not time_series_data:
        print("Warning: No time series data returned from prepare_weekly_time_series")
        # Try to get states from queryset directly to see what's available
        states = queryset.values_list('state', flat=True).distinct().exclude(state__isnull=True).exclude(state='')
        states_list = list(states)
        print(f"Available states in queryset: {states_list[:10]}")
        
        # Fallback: If we have states but no time series, create simple forecasts using averages
        if states_list:
            print(f"Creating fallback forecasts for {len(states_list)} states using simple averages")
            current_date = timezone.now().date()
            fallback_forecasts = []
            
            # Calculate date range for averaging - use a reasonable default
            # If user provided date range, estimate weeks from that, otherwise use 52 weeks
            date_range_weeks = 52  # Default
            try:
                min_date = queryset.aggregate(min_date=Min('enquiry_date'))['min_date']
                max_date = queryset.aggregate(max_date=Max('enquiry_date'))['max_date']
                if min_date and max_date:
                    date_range_days = (max_date - min_date).days
                    date_range_weeks = max(1, date_range_days / 7)
            except:
                pass
            
            for state in states_list:
                state_qs = queryset.filter(state=state)
                total_count = state_qs.count()
                # Estimate weekly average based on total count and date range
                weekly_avg = max(0.1, total_count / max(1, date_range_weeks)) if total_count > 0 else 0.1
                
                forecast_weeks = []
                for i in range(horizon_weeks):
                    week_start = current_date + timedelta(weeks=i)
                    week_key = week_start.strftime('%Y-W%W')
                    forecast_weeks.append({
                        'week': week_key,
                        'date': week_start.isoformat(),
                        'forecasted_enquiries': int(weekly_avg) if metric in ['enquiries', 'both'] else None,
                        'forecasted_value': 0 if metric in ['order_value', 'both'] else None,
                    })
                
                fallback_forecasts.append({
                    'state': state,
                    'forecast_weeks': forecast_weeks,
                    'total_forecasted_enquiries': int(weekly_avg * horizon_weeks) if metric in ['enquiries', 'both'] else 0,
                    'total_forecasted_value': 0 if metric in ['order_value', 'both'] else 0,
                    'confidence': 'low',
                    'model_used': 'Simple Average (Fallback)'
                })
            
            return fallback_forecasts
        
        return []
    
    state_forecasts = []
    current_date = timezone.now().date()
    
    # Group states and their value series
    states_processed = set()
    
    for key, df in time_series_data.items():
        if key.endswith('_value'):
            continue  # Will handle value series with their corresponding state
        
        state = key
        if state in states_processed:
            continue
        
        states_processed.add(state)
        
        # Train SARIMA for enquiries
        enq_sarima_result = None
        enq_forecast_values = None
        confidence = 'low'
        model_used = 'Moving Average'
        
        if metric in ['enquiries', 'both']:
            enq_sarima_result = train_sarima_optimized(df, forecast_periods=horizon_weeks, seasonal_periods=52)
            
            if enq_sarima_result:
                enq_forecast_values = enq_sarima_result['forecast']
                confidence = 'high' if enq_sarima_result['metrics']['mape'] < 15 else 'medium' if enq_sarima_result['metrics']['mape'] < 30 else 'low'
                model_used = enq_sarima_result['model_name']
            else:
                # Fallback: use average of last 4 weeks
                avg_value = df['y'].tail(4).mean() if len(df) >= 4 else df['y'].mean()
                enq_forecast_values = [float(avg_value)] * horizon_weeks
        
        # Train SARIMA for order value if metric includes order_value
        val_forecast_values = None
        if metric in ['order_value', 'both']:
            value_key = f'{state}_value'
            if value_key in time_series_data:
                value_df = time_series_data[value_key]
                val_sarima_result = train_sarima_optimized(value_df, forecast_periods=horizon_weeks, seasonal_periods=52)
                
                if val_sarima_result:
                    val_forecast_values = val_sarima_result['forecast']
                    # Use better confidence if value model is better
                    val_confidence = 'high' if val_sarima_result['metrics']['mape'] < 15 else 'medium' if val_sarima_result['metrics']['mape'] < 30 else 'low'
                    if val_confidence == 'high' and confidence != 'high':
                        confidence = val_confidence
                else:
                    avg_value = value_df['y'].tail(4).mean() if len(value_df) >= 4 else value_df['y'].mean()
                    val_forecast_values = [float(avg_value)] * horizon_weeks
        
        # Generate weekly forecast dates
        forecast_weeks = []
        for i in range(horizon_weeks):
            week_start = current_date + timedelta(weeks=i)
            week_key = week_start.strftime('%Y-W%W')
            
            week_data = {
                'week': week_key,
                'date': week_start.isoformat(),
            }
            
            if metric in ['enquiries', 'both'] and enq_forecast_values:
                week_data['forecasted_enquiries'] = max(0, int(enq_forecast_values[i]))
            
            if metric in ['order_value', 'both'] and val_forecast_values:
                week_data['forecasted_value'] = max(0, float(val_forecast_values[i]))
            
            forecast_weeks.append(week_data)
        
        state_forecasts.append({
            'state': state,
            'forecast_weeks': forecast_weeks,
            'total_forecasted_enquiries': sum([w.get('forecasted_enquiries', 0) or 0 for w in forecast_weeks]),
            'total_forecasted_value': sum([w.get('forecasted_value', 0) or 0 for w in forecast_weeks]),
            'confidence': confidence,
            'model_used': model_used
        })
    
    return state_forecasts


def forecast_dealer(state_forecast, queryset, horizon_weeks, metric='both'):
    """
    Forecast dealer-level demand (dependent on state)
    For each dealer in a state, trains SARIMA if sufficient data, else uses proportional allocation
    Ensures dealer forecasts sum to state forecast (reconciliation)
    """
    if not state_forecast:
        return []
    
    # Get proportions for fallback
    proportions = calculate_historical_proportions(queryset, 'state', 'dealer', metric=metric)
    
    dealer_forecasts = []
    
    for state_data in state_forecast:
        state = state_data['state']
        state_weekly_forecast = state_data['forecast_weeks']
        
        # Get dealers for this state
        dealers = queryset.filter(state=state).values_list('dealer', flat=True).distinct()
        
        # Prepare time series for each dealer
        dealer_time_series = prepare_weekly_time_series(
            queryset.filter(state=state),
            'dealer',
            metric=metric
        )
        
        state_dealer_forecasts = []
        
        for dealer in dealers:
            if not dealer:
                continue
            
            # Check if we have sufficient data for SARIMA
            has_sufficient_data = dealer in dealer_time_series and len(dealer_time_series[dealer]) >= 12
            
            if has_sufficient_data:
                # Train SARIMA
                df = dealer_time_series[dealer]
                sarima_result = train_sarima_optimized(df, forecast_periods=horizon_weeks, seasonal_periods=52)
                
                if sarima_result:
                    forecast_values = sarima_result['forecast']
                    confidence = 'high' if sarima_result['metrics']['mape'] < 15 else 'medium' if sarima_result['metrics']['mape'] < 30 else 'low'
                    model_used = sarima_result['model_name']
                else:
                    has_sufficient_data = False  # Fall back to proportions
            else:
                sarima_result = None
            
            if not has_sufficient_data:
                # Use proportional allocation
                dealer_prop = proportions.get(state, {}).get(dealer, 0)
                if dealer_prop == 0:
                    continue  # Skip dealers with no historical data
                
                # Allocate state forecast proportionally
                forecast_values = []
                for week_data in state_weekly_forecast:
                    if metric in ['enquiries', 'both']:
                        enq_value = (week_data.get('forecasted_enquiries', 0) or 0) * dealer_prop
                        forecast_values.append({
                            'forecasted_enquiries': max(0, int(enq_value))
                        })
                    if metric in ['order_value', 'both']:
                        val_value = (week_data.get('forecasted_value', 0) or 0) * dealer_prop
                        if 'forecasted_enquiries' not in forecast_values[-1] if forecast_values else True:
                            forecast_values.append({})
                        if forecast_values:
                            forecast_values[-1]['forecasted_value'] = max(0, float(val_value))
                
                confidence = 'low'
                model_used = 'Proportional Allocation'
            
            # Generate weekly forecast structure
            forecast_weeks = []
            current_date = timezone.now().date()
            
            for i in range(horizon_weeks):
                week_start = current_date + timedelta(weeks=i)
                week_key = week_start.strftime('%Y-W%W')
                
                if has_sufficient_data and sarima_result:
                    week_forecast = {
                        'week': week_key,
                        'date': week_start.isoformat(),
                        'forecasted_enquiries': max(0, int(forecast_values[i])) if metric in ['enquiries', 'both'] else None,
                        'forecasted_value': max(0, float(forecast_values[i])) if metric in ['order_value', 'both'] else None,
                    }
                else:
                    week_forecast = forecast_values[i] if i < len(forecast_values) else {}
                    week_forecast['week'] = week_key
                    week_forecast['date'] = week_start.isoformat()
                
                forecast_weeks.append(week_forecast)
            
            state_dealer_forecasts.append({
                'dealer': dealer,
                'state': state,
                'forecast_weeks': forecast_weeks,
                'total_forecasted_enquiries': sum([w.get('forecasted_enquiries', 0) or 0 for w in forecast_weeks]),
                'total_forecasted_value': sum([w.get('forecasted_value', 0) or 0 for w in forecast_weeks]),
                'confidence': confidence,
                'model_used': model_used
            })
        
        # Reconcile dealer forecasts to state forecast
        state_dealer_forecasts = reconcile_forecasts(
            [state_data],
            state_dealer_forecasts,
            metric=metric
        )
        
        dealer_forecasts.extend(state_dealer_forecasts)
    
    return dealer_forecasts


def forecast_location(dealer_forecast, queryset, horizon_weeks, metric='both'):
    """
    Forecast location-level demand (dependent on dealer)
    Uses SARIMA if data sufficient, otherwise uses proportional allocation
    Ensures location forecasts sum to dealer forecast
    """
    if not dealer_forecast:
        return []
    
    # Get proportions for fallback
    proportions = calculate_historical_proportions(queryset, 'dealer', 'location', metric=metric)
    
    location_forecasts = []
    
    for dealer_data in dealer_forecast:
        dealer = dealer_data['dealer']
        dealer_weekly_forecast = dealer_data['forecast_weeks']
        
        # Get locations for this dealer
        locations = queryset.filter(dealer=dealer).values_list('location', flat=True).distinct()
        
        # Prepare time series for each location
        location_time_series = prepare_weekly_time_series(
            queryset.filter(dealer=dealer),
            'location',
            metric=metric
        )
        
        dealer_location_forecasts = []
        
        for location in locations:
            if not location:
                continue
            
            # Check if we have sufficient data for SARIMA
            has_sufficient_data = location in location_time_series and len(location_time_series[location]) >= 12
            
            if has_sufficient_data:
                # Train SARIMA
                df = location_time_series[location]
                sarima_result = train_sarima_optimized(df, forecast_periods=horizon_weeks, seasonal_periods=52)
                
                if sarima_result:
                    forecast_values = sarima_result['forecast']
                    confidence = 'high' if sarima_result['metrics']['mape'] < 15 else 'medium' if sarima_result['metrics']['mape'] < 30 else 'low'
                    model_used = sarima_result['model_name']
                else:
                    has_sufficient_data = False
            else:
                sarima_result = None
            
            if not has_sufficient_data:
                # Use proportional allocation
                location_prop = proportions.get(dealer, {}).get(location, 0)
                if location_prop == 0:
                    continue
                
                # Allocate dealer forecast proportionally
                forecast_values = []
                for week_data in dealer_weekly_forecast:
                    if metric in ['enquiries', 'both']:
                        enq_value = (week_data.get('forecasted_enquiries', 0) or 0) * location_prop
                        forecast_values.append({
                            'forecasted_enquiries': max(0, int(enq_value))
                        })
                    if metric in ['order_value', 'both']:
                        val_value = (week_data.get('forecasted_value', 0) or 0) * location_prop
                        if 'forecasted_enquiries' not in forecast_values[-1] if forecast_values else True:
                            forecast_values.append({})
                        if forecast_values:
                            forecast_values[-1]['forecasted_value'] = max(0, float(val_value))
                
                confidence = 'low'
                model_used = 'Proportional Allocation'
            
            # Generate weekly forecast structure
            forecast_weeks = []
            current_date = timezone.now().date()
            
            for i in range(horizon_weeks):
                week_start = current_date + timedelta(weeks=i)
                week_key = week_start.strftime('%Y-W%W')
                
                if has_sufficient_data and sarima_result:
                    week_forecast = {
                        'week': week_key,
                        'date': week_start.isoformat(),
                        'forecasted_enquiries': max(0, int(forecast_values[i])) if metric in ['enquiries', 'both'] else None,
                        'forecasted_value': max(0, float(forecast_values[i])) if metric in ['order_value', 'both'] else None,
                    }
                else:
                    week_forecast = forecast_values[i] if i < len(forecast_values) else {}
                    week_forecast['week'] = week_key
                    week_forecast['date'] = week_start.isoformat()
                
                forecast_weeks.append(week_forecast)
            
            dealer_location_forecasts.append({
                'location': location,
                'dealer': dealer,
                'state': dealer_data.get('state'),
                'forecast_weeks': forecast_weeks,
                'total_forecasted_enquiries': sum([w.get('forecasted_enquiries', 0) or 0 for w in forecast_weeks]),
                'total_forecasted_value': sum([w.get('forecasted_value', 0) or 0 for w in forecast_weeks]),
                'confidence': confidence,
                'model_used': model_used
            })
        
        # Reconcile location forecasts to dealer forecast
        dealer_location_forecasts = reconcile_forecasts(
            [dealer_data],
            dealer_location_forecasts,
            metric=metric
        )
        
        location_forecasts.extend(dealer_location_forecasts)
    
    return location_forecasts


def forecast_range(queryset, horizon_weeks, metric='both'):
    """
    Independent forecast for KVA Range (not part of hierarchy)
    Trains separate SARIMA model for each kva_range
    """
    print(f"forecast_range: Starting with queryset count: {queryset.count()}")
    time_series_data = prepare_weekly_time_series(queryset, 'kva_range', metric=metric)
    
    print(f"forecast_range: Got {len(time_series_data)} kva ranges with time series data")
    if not time_series_data:
        print("Warning: No time series data for kva_range, trying fallback")
        # Fallback: Get kva ranges and create simple forecasts
        kva_ranges = queryset.values_list('kva_range', flat=True).distinct().exclude(kva_range__isnull=True).exclude(kva_range='')
        kva_ranges_list = list(kva_ranges)
        print(f"Available kva_range values: {kva_ranges_list[:10]}")
        
        if kva_ranges_list:
            print(f"Creating fallback forecasts for {len(kva_ranges_list)} kva ranges")
            current_date = timezone.now().date()
            fallback_forecasts = {}
            
            # Calculate date range for averaging
            date_range_weeks = 52
            try:
                min_date = queryset.aggregate(min_date=Min('enquiry_date'))['min_date']
                max_date = queryset.aggregate(max_date=Max('enquiry_date'))['max_date']
                if min_date and max_date:
                    date_range_days = (max_date - min_date).days
                    date_range_weeks = max(1, date_range_days / 7)
            except:
                pass
            
            for kva_range in kva_ranges_list:
                range_qs = queryset.filter(kva_range=kva_range)
                total_count = range_qs.count()
                weekly_avg = max(0.1, total_count / max(1, date_range_weeks)) if total_count > 0 else 0.1
                
                forecast_weeks = []
                for i in range(horizon_weeks):
                    week_start = current_date + timedelta(weeks=i)
                    week_key = week_start.strftime('%Y-W%W')
                    forecast_weeks.append({
                        'week': week_key,
                        'date': week_start.isoformat(),
                        'forecasted_enquiries': int(weekly_avg) if metric in ['enquiries', 'both'] else None,
                        'forecasted_value': 0 if metric in ['order_value', 'both'] else None,
                    })
                
                fallback_forecasts[kva_range] = {
                    'kva_range': kva_range,
                    'forecast_weeks': forecast_weeks,
                    'total_forecasted_enquiries': int(weekly_avg * horizon_weeks) if metric in ['enquiries', 'both'] else 0,
                    'total_forecasted_value': 0 if metric in ['order_value', 'both'] else 0,
                    'confidence': 'low',
                    'model_used': 'Simple Average (Fallback)'
                }
            
            return fallback_forecasts
        
        return {}
    
    range_forecasts = {}
    current_date = timezone.now().date()
    
    for kva_range, df in time_series_data.items():
        if kva_range.endswith('_value'):
            continue
        
        # Train SARIMA
        sarima_result = train_sarima_optimized(df, forecast_periods=horizon_weeks, seasonal_periods=52)
        
        if sarima_result:
            forecast_values = sarima_result['forecast']
            confidence = 'high' if sarima_result['metrics']['mape'] < 15 else 'medium' if sarima_result['metrics']['mape'] < 30 else 'low'
            model_used = sarima_result['model_name']
        else:
            avg_value = df['y'].tail(4).mean() if len(df) >= 4 else df['y'].mean()
            forecast_values = [float(avg_value)] * horizon_weeks
            confidence = 'low'
            model_used = 'Moving Average'
        
        # Generate weekly forecast
        forecast_weeks = []
        for i in range(horizon_weeks):
            week_start = current_date + timedelta(weeks=i)
            week_key = week_start.strftime('%Y-W%W')
            
            forecast_weeks.append({
                'week': week_key,
                'date': week_start.isoformat(),
                'forecasted_enquiries': max(0, int(forecast_values[i])) if metric in ['enquiries', 'both'] else None,
                'forecasted_value': max(0, float(forecast_values[i])) if metric in ['order_value', 'both'] else None,
            })
        
        # Handle order value if metric is 'both'
        if metric == 'both' and f'{kva_range}_value' in time_series_data:
            value_df = time_series_data[f'{kva_range}_value']
            value_sarima = train_sarima_optimized(value_df, forecast_periods=horizon_weeks, seasonal_periods=52)
            
            if value_sarima:
                value_forecast = value_sarima['forecast']
            else:
                avg_value = value_df['y'].tail(4).mean() if len(value_df) >= 4 else value_df['y'].mean()
                value_forecast = [float(avg_value)] * horizon_weeks
            
            for i, week_data in enumerate(forecast_weeks):
                week_data['forecasted_value'] = max(0, float(value_forecast[i]))
        
        range_forecasts[kva_range] = {
            'kva_range': kva_range,
            'forecast_weeks': forecast_weeks,
            'total_forecasted_enquiries': sum([w.get('forecasted_enquiries', 0) or 0 for w in forecast_weeks]),
            'total_forecasted_value': sum([w.get('forecasted_value', 0) or 0 for w in forecast_weeks]),
            'confidence': confidence,
            'model_used': model_used
        }
    
    return range_forecasts


def forecast_sector(queryset, horizon_weeks, metric='both'):
    """
    Independent forecast for Sector (segment field) - not part of hierarchy
    Trains separate SARIMA model for each segment
    """
    print(f"forecast_sector: Starting with queryset count: {queryset.count()}")
    time_series_data = prepare_weekly_time_series(queryset, 'segment', metric=metric)
    
    print(f"forecast_sector: Got {len(time_series_data)} sectors with time series data")
    if not time_series_data:
        print("Warning: No time series data for segment, trying fallback")
        # Fallback: Get segments and create simple forecasts
        segments = queryset.values_list('segment', flat=True).distinct().exclude(segment__isnull=True).exclude(segment='')
        segments_list = list(segments)
        print(f"Available segment values: {segments_list[:10]}")
        
        if segments_list:
            print(f"Creating fallback forecasts for {len(segments_list)} sectors")
            current_date = timezone.now().date()
            fallback_forecasts = {}
            
            # Calculate date range for averaging
            date_range_weeks = 52
            try:
                min_date = queryset.aggregate(min_date=Min('enquiry_date'))['min_date']
                max_date = queryset.aggregate(max_date=Max('enquiry_date'))['max_date']
                if min_date and max_date:
                    date_range_days = (max_date - min_date).days
                    date_range_weeks = max(1, date_range_days / 7)
            except:
                pass
            
            for segment in segments_list:
                segment_qs = queryset.filter(segment=segment)
                total_count = segment_qs.count()
                weekly_avg = max(0.1, total_count / max(1, date_range_weeks)) if total_count > 0 else 0.1
                
                forecast_weeks = []
                for i in range(horizon_weeks):
                    week_start = current_date + timedelta(weeks=i)
                    week_key = week_start.strftime('%Y-W%W')
                    forecast_weeks.append({
                        'week': week_key,
                        'date': week_start.isoformat(),
                        'forecasted_enquiries': int(weekly_avg) if metric in ['enquiries', 'both'] else None,
                        'forecasted_value': 0 if metric in ['order_value', 'both'] else None,
                    })
                
                fallback_forecasts[segment] = {
                    'sector': segment,
                    'forecast_weeks': forecast_weeks,
                    'total_forecasted_enquiries': int(weekly_avg * horizon_weeks) if metric in ['enquiries', 'both'] else 0,
                    'total_forecasted_value': 0 if metric in ['order_value', 'both'] else 0,
                    'confidence': 'low',
                    'model_used': 'Simple Average (Fallback)'
                }
            
            return fallback_forecasts
        
        return {}
    
    sector_forecasts = {}
    current_date = timezone.now().date()
    
    for segment, df in time_series_data.items():
        if segment.endswith('_value'):
            continue
        
        # Train SARIMA
        sarima_result = train_sarima_optimized(df, forecast_periods=horizon_weeks, seasonal_periods=52)
        
        if sarima_result:
            forecast_values = sarima_result['forecast']
            confidence = 'high' if sarima_result['metrics']['mape'] < 15 else 'medium' if sarima_result['metrics']['mape'] < 30 else 'low'
            model_used = sarima_result['model_name']
        else:
            avg_value = df['y'].tail(4).mean() if len(df) >= 4 else df['y'].mean()
            forecast_values = [float(avg_value)] * horizon_weeks
            confidence = 'low'
            model_used = 'Moving Average'
        
        # Generate weekly forecast
        forecast_weeks = []
        for i in range(horizon_weeks):
            week_start = current_date + timedelta(weeks=i)
            week_key = week_start.strftime('%Y-W%W')
            
            forecast_weeks.append({
                'week': week_key,
                'date': week_start.isoformat(),
                'forecasted_enquiries': max(0, int(forecast_values[i])) if metric in ['enquiries', 'both'] else None,
                'forecasted_value': max(0, float(forecast_values[i])) if metric in ['order_value', 'both'] else None,
            })
        
        # Handle order value if metric is 'both'
        if metric == 'both' and f'{segment}_value' in time_series_data:
            value_df = time_series_data[f'{segment}_value']
            value_sarima = train_sarima_optimized(value_df, forecast_periods=horizon_weeks, seasonal_periods=52)
            
            if value_sarima:
                value_forecast = value_sarima['forecast']
            else:
                avg_value = value_df['y'].tail(4).mean() if len(value_df) >= 4 else value_df['y'].mean()
                value_forecast = [float(avg_value)] * horizon_weeks
            
            for i, week_data in enumerate(forecast_weeks):
                week_data['forecasted_value'] = max(0, float(value_forecast[i]))
        
        sector_forecasts[segment] = {
            'sector': segment,
            'forecast_weeks': forecast_weeks,
            'total_forecasted_enquiries': sum([w.get('forecasted_enquiries', 0) or 0 for w in forecast_weeks]),
            'total_forecasted_value': sum([w.get('forecasted_value', 0) or 0 for w in forecast_weeks]),
            'confidence': confidence,
            'model_used': model_used
        }
    
    return sector_forecasts


def generate_complete_forecast(queryset, horizon_weeks, metric='both'):
    """
    Orchestrate complete hierarchical forecast generation
    Generates all forecast layers and ensures consistency
    """
    # Step 1: State Forecast (Root)
    state_forecast = forecast_state(queryset, horizon_weeks, metric=metric)
    
    # Step 2: Dealer Forecast (Dependent on State)
    dealer_forecast = forecast_dealer(state_forecast, queryset, horizon_weeks, metric=metric)
    
    # Step 3: Location Forecast (Dependent on Dealer)
    location_forecast = forecast_location(dealer_forecast, queryset, horizon_weeks, metric=metric)
    
    # Step 4: Range Forecast (Independent)
    range_forecast = forecast_range(queryset, horizon_weeks, metric=metric)
    
    # Step 5: Sector Forecast (Independent)
    sector_forecast = forecast_sector(queryset, horizon_weeks, metric=metric)
    
    # Calculate summary statistics
    total_enquiries = sum([s.get('total_forecasted_enquiries', 0) for s in state_forecast])
    total_value = sum([s.get('total_forecasted_value', 0) for s in state_forecast])
    
    # Determine overall confidence (average of state forecasts)
    confidences = [s.get('confidence', 'low') for s in state_forecast]
    confidence_map = {'high': 3, 'medium': 2, 'low': 1}
    avg_confidence_score = sum([confidence_map.get(c, 1) for c in confidences]) / len(confidences) if confidences else 1
    overall_confidence = 'high' if avg_confidence_score >= 2.5 else 'medium' if avg_confidence_score >= 1.5 else 'low'
    
    return {
        'horizon_weeks': horizon_weeks,
        'generated_at': timezone.now().isoformat(),
        'state_forecast': state_forecast,
        'dealer_forecast': dealer_forecast,
        'location_forecast': location_forecast,
        'range_forecast': range_forecast,
        'sector_forecast': sector_forecast,
        'summary': {
            'total_forecasted_enquiries': int(total_enquiries),
            'total_forecasted_value': float(total_value),
            'confidence': overall_confidence,
            'num_states': len(state_forecast),
            'num_dealers': len(dealer_forecast),
            'num_locations': len(location_forecast),
            'num_ranges': len(range_forecast),
            'num_sectors': len(sector_forecast)
        }
    }

