import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdpl_backend.settings')
django.setup()

from django.contrib.auth.models import User

u, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@crm.com',
        'is_staff': True,
        'is_superuser': True
    }
)
u.set_password('Admin@123')
u.save()
print('✅ Admin user ready: admin / Admin@123')
