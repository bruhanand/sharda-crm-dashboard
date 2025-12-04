from django.contrib.auth.models import User

# Create or update admin user
try:
    user = User.objects.get(username='admin')
    print('Admin user already exists')
except User.DoesNotExist:
    user = User.objects.create_superuser(
        username='admin',
        email='admin@crm.com',
        password='Admin@123'
    )
    print('Admin user created')

# Ensure password is set correctly
user.set_password('Admin@123')
user.is_staff = True
user.is_superuser = True
user.save()

print('=== ADMIN CREDENTIALS ===')
print('Username: admin')
print('Password: Admin@123')
print('Email:', user.email)
print('Is Admin:', user.is_superuser)
print('Is Staff:', user.is_staff)
print('========================')
