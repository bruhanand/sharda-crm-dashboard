#!/bin/bash

# ============================================
# Fix 413 Error - Deployment Script
# ============================================
# This script rebuilds and redeploys the application
# with updated upload size limits
# ============================================

set -e  # Exit on any error

echo "================================================"
echo "Fixing 413 Request Entity Too Large Error"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Stopping current services...${NC}"
docker-compose -f docker-compose.prod.yml down

echo ""
echo -e "${YELLOW}Step 2: Rebuilding backend (with new Django settings)...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache backend

echo ""
echo -e "${YELLOW}Step 3: Rebuilding frontend (with new Nginx config)...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache frontend

echo ""
echo -e "${YELLOW}Step 4: Starting all services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${YELLOW}Step 5: Waiting for services to be healthy...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}Step 6: Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Upload limits have been increased to:"
echo "  - Nginx: 100MB"
echo "  - Django: 100MB"
echo "  - Gunicorn timeout: 300 seconds"
echo ""
echo "You can now upload large datasets without 413 errors."
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
