"""
Database migration to add strategic indexes for performance optimization.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0001_initial'),  # Adjust to your latest migration
    ]

    operations = [
        # Index on frequently filtered fields
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['lead_status'], name='idx_lead_status'),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['win_flag'], name='idx_win_flag'),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['enquiry_date'], name='idx_enquiry_date'),
        ),
        
        # Composite indexes for common queries
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(
                fields=['lead_status', 'enquiry_date'], 
                name='idx_status_date'
            ),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(
                fields=['win_flag', 'order_value'], 
                name='idx_win_value'
            ),
        ),
        
        # Index on dealer for leaderboard queries
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['dealer'], name='idx_dealer'),
        ),
        
        # Index on segment for distribution queries
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['segment'], name='idx_segment'),
        ),
        
        # Index for overdue follow-up queries
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(
                fields=['next_followup_date'], 
                name='idx_followup_date'
            ),
        ),
    ]
