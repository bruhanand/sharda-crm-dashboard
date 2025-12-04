"""
Management command to create admin user from environment variables.
Usage: python manage.py create_admin
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create admin user from environment variables (ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL)'

    def handle(self, *args, **options):
        # Get credentials from environment variables
        username = os.getenv('ADMIN_USERNAME', 'admin')
        password = os.getenv('ADMIN_PASSWORD')
        email = os.getenv('ADMIN_EMAIL', 'admin@example.com')
        
        # Validate required password
        if not password:
            self.stdout.write(
                self.style.ERROR('❌ ADMIN_PASSWORD environment variable is not set!')
            )
            self.stdout.write(
                self.style.WARNING('Set it in your .env file or export it before running this command')
            )
            return
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'⚠ User "{username}" already exists. Skipping creation.')
            )
            self.stdout.write(
                self.style.SUCCESS('Use Django admin or change_password command to update password.')
            )
            return
        
        # Create superuser
        try:
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(
                self.style.SUCCESS(f'✅ Admin user "{username}" created successfully!')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   Email: {email}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   Superuser: Yes')
            )
            self.stdout.write(
                self.style.SUCCESS(f'   Staff: Yes')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Failed to create admin user: {str(e)}')
            )

