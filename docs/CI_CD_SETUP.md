# CI/CD Setup Guide

## Prerequisites
- GitHub repository
- GitHub Actions enabled

## Setup Steps

### 1. Install Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install the git hooks
pre-commit install

# (Optional) Run against all files
pre-commit run --all-files
```

### 2. Configure GitHub Actions

The CI pipeline runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**What it does:**
- ✅ Runs backend tests (Django)
- ✅ Runs frontend tests (Vitest)
- ✅ Lints Python code (flake8, black, isort)
- ✅ Lints JavaScript code (ESLint)
- ✅ Builds Docker images
- ✅ Generates coverage reports

### 3. Required Secrets

Add these secrets to GitHub repository settings:

```
(None required for basic setup)
```

### 4. Optional: Codecov Integration

For code coverage reporting:

1. Sign up at https://codecov.io
2. Add repository
3. Add token to GitHub secrets as `CODECOV_TOKEN`

### 5. Branch Protection Rules

Recommended settings for `main` branch:

1. Go to: Repository Settings → Branches → Branch protection rules
2. Add rule for `main`:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - Required checks:
     - Backend Tests
     - Frontend Tests
     - Backend Linting
     - Frontend Linting
     - Build Check
   - ✅ Require pull request reviews (1 approval)
   - ✅ Dismiss stale reviews
   - ✅ Require linear history

## Manual Commands

### Run backend tests locally
```bash
cd backend
python manage.py test
```

### Run frontend tests locally
```bash
cd frontend
npm test
```

### Run linters locally
```bash
# Backend
cd backend
flake8 .
black --check .
isort --check .

# Frontend
cd frontend
npm run lint
```

### Build Docker images
```bash
docker-compose build
```

## Troubleshooting

### Pre-commit failing
```bash
# Update hooks
pre-commit autoupdate

# Skip hooks temporarily (not recommended)
git commit --no-verify
```

### CI failing
Check the GitHub Actions tab for detailed logs.

### Coverage not uploading
Verify `CODECOV_TOKEN` is set in repository secrets.
