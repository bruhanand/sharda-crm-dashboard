#!/bin/bash
# Smoke test for login functionality
# Run: bash scripts/smoke_login.sh

set -e

API_BASE="${API_BASE:-http://localhost:8000/api/v1}"
USERNAME="${USERNAME:-admin}"
PASSWORD="${PASSWORD:-Admin@123}"

echo "=== Login Smoke Test ==="
echo "API: $API_BASE"
echo "User: $USERNAME"
echo ""

# Test 1: OPTIONS preflight
echo "Test 1: OPTIONS Preflight..."
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS "$API_BASE/auth/login/" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type")

if [ "$response" = "200" ] || [ "$response" = "204" ]; then
  echo "✅ OPTIONS preflight: $response"
else
  echo "❌ OPTIONS preflight failed: $response"
  exit 1
fi

# Test 2: POST login
echo "Test 2: POST Login..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_BASE/auth/login/" \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE/d')

if [ "$http_code" = "200" ]; then
 echo "✅ LOGIN SUCCESS: $http_code"
  echo "$body" | python -m json.tool 2>/dev/null || echo "$body"
else
  echo "❌ LOGIN FAILED: $http_code"
  echo "$body"
  exit 1
fi

echo ""
echo "=== All tests passed ✅ ==="
