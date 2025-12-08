"""
ML-Based Forecasting Service (WITHOUT pmdarima)
Implements multiple forecasting models with automatic selection based on performance metrics
"""
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
import pandas as pd
import numpy as np
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

# Model imports
try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    from prophet import Prophet
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("Warning: ML libraries not installed. Using fallback forecasting.")


def calculate_mape(y_true, y_pred):
    """Calculate Mean Absolute Percentage Error"""
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def calculate_mase(y_true, y_pred, y_train):
    """Calculate Mean Absolute Scaled Error"""
    mae = mean_absolute_error(y_true, y_pred)
    mae_naive = mean_absolute_error(y_train[1:], y_train[:-1])
    return mae / mae_naive if mae_naive != 0 else np.inf


def prepare_time_series_data(queryset, date_field='enquiry_date', months_back=12):
    """
    Convert queryset to pandas DataFrame for time series analysis
    Returns: DataFrame with monthly aggregation
    """
    cutoff_date = timezone.now().date() - timedelta(days=30 * months_back)
    
    # Get monthly counts
    monthly_data = list(
        queryset.filter(**{f'{date_field}__gte': cutoff_date})
        .annotate(month_truncated=TruncMonth(date_field))
        .values('month_truncated')
        .annotate(count=Count('id'))
        .order_by('month_truncated')
    )
    
    if not monthly_data:
        return None
    
    # Convert to DataFrame
    df = pd.DataFrame([{
        'ds': item['month_truncated'],
        'y': item['count']
    } for item in monthly_data])
    
    df['ds'] = pd.to_datetime(df['ds'])
    df = df.set_index('ds')
    
    return df


def train_holt_winters(data, forecast_periods=6, seasonal_periods=12):
    """
    Train Holt-Winters (Triple Exponential Smoothing) model
    Best for: Data with trend and seasonality, fast training
    """
    try:
        if len(data) < seasonal_periods * 2:
            seasonal_periods = None  # Not enough data for seasonality
        
        model = ExponentialSmoothing(
            data['y'],
            seasonal_periods=seasonal_periods,
            trend='add',
            seasonal='add' if seasonal_periods else None
        )
        fitted = model.fit()
        forecast = fitted.forecast(steps=forecast_periods)
        
        # Calculate metrics on training data
        fitted_values = fitted.fittedvalues
        mae = mean_absolute_error(data['y'], fitted_values)
        rmse = np.sqrt(mean_squared_error(data['y'], fitted_values))
        mape = calculate_mape(data['y'], fitted_values)
        
        return {
            'model_name': 'Holt-Winters',
            'forecast': forecast.tolist(),
            'metrics': {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape),
                'aic': float(fitted.aic) if hasattr(fitted, 'aic') else None
            }
        }
    except Exception as e:
        return None


def train_arima(data, forecast_periods=6):
    """
    Train ARIMA model with grid search for best parameters (replaces auto_arima)
    Best for: Univariate time series with trends
    """
    try:
        # Grid search for best ARIMA parameters
        best_aic = np.inf
        best_model = None
        best_order = (1, 1, 1)
        
        # Try different p, d, q combinations
        for p in range(0, 3):
            for d in range(0, 2):
                for q in range(0, 3):
                    try:
                        model = ARIMA(data['y'], order=(p, d, q))
                        fitted = model.fit()
                        if fitted.aic < best_aic:
                            best_aic = fitted.aic
                            best_model = fitted
                            best_order = (p, d, q)
                    except:
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
            'model_name': f'ARIMA{best_order}',
            'forecast': forecast.tolist(),
            'metrics': {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape),
                'aic': float(best_aic)
            }
        }
    except Exception as e:
        print(f"ARIMA error: {e}")
        return None


def train_sarima(data, forecast_periods=6, seasonal_periods=12):
    """
    Train SARIMA model with grid search (replaces auto_arima)
    Best for: Data with seasonal patterns
    """
    try:
        if len(data) < seasonal_periods * 2:
            return None  # Not enough data
        
        # Simplified grid search for SARIMA
        best_aic = np.inf
        best_model = None
        best_order = (1, 1, 1)
        best_seasonal_order = (1, 1, 1, seasonal_periods)
        
        # Limited search for speed
        for p in [0, 1]:
            for d in [0, 1]:
                for q in [0, 1]:
                    for P in [0, 1]:
                        for D in [0, 1]:
                            for Q in [0, 1]:
                                try:
                                    model = SARIMAX(
                                        data['y'],
                                        order=(p, d, q),
                                        seasonal_order=(P, D, Q, seasonal_periods)
                                    )
                                    fitted = model.fit(disp=False)
                                    if fitted.aic < best_aic:
                                        best_aic = fitted.aic
                                        best_model = fitted
                                        best_order = (p, d, q)
                                        best_seasonal_order = (P, D, Q, seasonal_periods)
                                except:
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
        print(f"SARIMA error: {e}")
        return None


def train_prophet(data, forecast_periods=6):
    """
    Train Prophet model
    Best for: Business time series with trends, seasonality, holidays
    """
    try:
        # Reset index for Prophet
        prophet_data = data.reset_index()
        prophet_data.columns = ['ds', 'y']
        
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode='multiplicative'
        )
        model.fit(prophet_data)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=forecast_periods, freq='MS')
        forecast_df = model.predict(future)
        
        # Extract forecast values
        forecast = forecast_df.tail(forecast_periods)['yhat'].tolist()
        
        # Calculate metrics on training data
        predictions = model.predict(prophet_data)
        mae =mean_absolute_error(prophet_data['y'], predictions['yhat'])
        rmse = np.sqrt(mean_squared_error(prophet_data['y'], predictions['yhat']))
        mape = calculate_mape(prophet_data['y'], predictions['yhat'])
        
        return {
            'model_name': 'Prophet',
            'forecast': forecast,
            'metrics': {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape),
                'aic': None  # Prophet doesn't provide AIC
            }
        }
    except Exception as e:
        print(f"Prophet error: {e}")
        return None


def select_best_model(data, forecast_periods=6):
    """
    Train multiple models and select the best one based on MAPE
    Returns: Best model's forecast and metadata
    """
    if not ML_AVAILABLE or data is None or len(data) < 6:
        # Fallback: simple moving average
        forecast = [int(data['y'].mean())] * forecast_periods if data is not None else [0] * forecast_periods
        return {
            'model_name': 'Simple Average',
            'forecast': forecast,
            'metrics': {'mape': 0, 'mae': 0, 'rmse': 0},
            'confidence': 'low'
        }
    
    models_to_try = [
        ('holt_winters', lambda: train_holt_winters(data, forecast_periods)),
        ('arima', lambda: train_arima(data, forecast_periods)),
        ('sarima', lambda: train_sarima(data, forecast_periods)),
        ('prophet', lambda: train_prophet(data, forecast_periods))
    ]
    
    results = {}
    
    for name, train_func in models_to_try:
        result = train_func()
        if result:
            results[name] = result
    
    if not results:
        # All models failed, use fallback
        forecast = [int(data['y'].mean())] * forecast_periods
        return {
            'model_name': 'Simple Average',
            'forecast': forecast,
            'metrics': {'mape': 0, 'mae': 0, 'rmse': 0},
            'confidence': 'low'
        }
    
    # Select best model based on MAPE (lower is better)
    best_model_name = min(results.keys(), key=lambda x: results[x]['metrics']['mape'])
    best_model = results[best_model_name]
    
    # Add confidence score
    mape = best_model['metrics']['mape']
    if mape < 10:
        confidence = 'high'
    elif mape < 20:
        confidence = 'medium'
    else:
        confidence = 'low'
    
    best_model['confidence'] = confidence
    best_model['all_models'] = {k: v['metrics'] for k, v in results.items()}
    
    return best_model


def ml_forecast_leads(queryset, months_to_forecast=6):
    """
    Generate ML-based forecast for lead counts over time
    """
    data = prepare_time_series_data(queryset, 'enquiry_date', months_back=12)
    result = select_best_model(data, months_to_forecast)
    
    # Generate future dates
    current_date = timezone.now().date()
    forecast_data = []
    
    for i in range(1, months_to_forecast + 1):
        future_month = current_date + timedelta(days=30 * i)
        forecast_data.append({
            'month': future_month.strftime('%Y-%m'),
            'forecasted_leads': max(0, int(result['forecast'][i-1])),
            'model': result['model_name'],
            'confidence': result['confidence']
        })
    
    return {
        'forecast': forecast_data,
        'model_metadata': {
            'model_used': result['model_name'],
            'confidence': result['confidence'],
            'metrics': result['metrics']
        }
    }


def ml_forecast_conversion(queryset, months_to_forecast=6):
    """
    Generate ML-based forecast for conversion rates
    """
    # Prepare conversion rate data
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
    
    if not monthly_conversions:
        return {'forecast': [], 'model_metadata': {}}
    
    # Calculate conversion rates
    df = pd.DataFrame([{
        'ds': item['month_truncated'],
        'y': (item['won'] / item['total'] * 100) if item['total'] > 0 else 0
    } for item in monthly_conversions])
    
    df['ds'] = pd.to_datetime(df['ds'])
    df = df.set_index('ds')
    
    result = select_best_model(df, months_to_forecast)
    
    # Generate future dates
    current_date = timezone.now().date()
    forecast_data = []
    
    for i in range(1, months_to_forecast + 1):
        future_month = current_date + timedelta(days=30 * i)
        rate = min(100, max(0, result['forecast'][i-1]))
        forecast_data.append({
            'month': future_month.strftime('%Y-%m'),
            'forecasted_conversion': round(rate, 1),
            'model': result['model_name'],
            'confidence': result['confidence']
        })
    
    return {
        'forecast': forecast_data,
        'model_metadata': {
            'model_used': result['model_name'],
            'confidence': result['confidence'],
            'metrics': result['metrics']
        }
    }
