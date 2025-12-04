#!/usr/bin/env python
"""
Ensure superuser exists for development/testing
Run: python scripts/ensure_superuser.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdpl_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = 'admin'
email = 'admin@crm.com'
password = 'Admin@123'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f"✅ Created superuser: {username} / {password}")
else:
    user = User.objects.get(username=username)
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"✅ Updated superuser: {username} / {password}")

print(f"\nCredentials:")
print(f"  Username: {username}")
print(f"  Password: {password}")
print(f"  Email: {email}")
