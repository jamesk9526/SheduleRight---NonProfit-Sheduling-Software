#!/bin/bash
# ScheduleRight - Linux Server Permissions Fix
# Fixes "Permission denied" errors when running `pnpm dev`

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${CYAN}$(printf '=%.0s' {1..60})${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..60})${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Main script
main() {
    print_header "ScheduleRight - Linux Server Permissions Fix"
    
    print_warning "This script fixes 'Permission denied' errors in node_modules"
    echo ""
    
    # Check if running as correct user
    print_info "Current user: $(whoami)"
    print_info "Current directory: $(pwd)"
    echo ""
    
    # Step 1: Clear node_modules and pnpm cache
    print_header "Step 1: Clearing node_modules and cache"
    
    if [ -d "node_modules" ]; then
        print_info "Removing node_modules..."
        rm -rf node_modules
        print_success "Removed node_modules"
    fi
    
    if [ -d ".pnpm-store" ]; then
        print_info "Removing .pnpm-store..."
        rm -rf .pnpm-store
        print_success "Removed .pnpm-store"
    fi
    
    # Clear pnpm global cache
    print_info "Clearing pnpm cache..."
    pnpm store prune 2>/dev/null || true
    print_success "Cleared pnpm cache"
    
    echo ""
    
    # Step 2: Reinstall dependencies
    print_header "Step 2: Reinstalling dependencies"
    
    print_info "Running pnpm install (this may take a few minutes)..."
    if pnpm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        echo "Try running: pnpm install --no-frozen-lockfile"
        exit 1
    fi
    
    echo ""
    
    # Step 3: Fix permissions on node_modules
    print_header "Step 3: Fixing permissions"
    
    print_info "Setting execute permissions on binaries..."
    
    # Make all files in node_modules/.bin executable
    if [ -d "node_modules/.bin" ]; then
        chmod +x node_modules/.bin/* 2>/dev/null || true
        print_success "Fixed node_modules/.bin permissions"
    fi
    
    # Make all files in node_modules executable (recursive)
    print_info "Setting execute permissions recursively (this may take a moment)..."
    find node_modules -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
    find node_modules -type f -name "*.node" -exec chmod +x {} \; 2>/dev/null || true
    
    # Fix workspace permissions
    print_info "Fixing workspace permissions..."
    chmod +x apps/*/node_modules/.bin/* 2>/dev/null || true
    chmod +x packages/*/node_modules/.bin/* 2>/dev/null || true
    
    print_success "Permissions fixed"
    
    echo ""
    
    # Step 4: Verify permissions
    print_header "Step 4: Verifying setup"
    
    # Check if next is executable
    if [ -x "node_modules/.bin/next" ]; then
        print_success "next binary is executable"
    else
        print_warning "next binary may not be executable"
    fi
    
    # Check if tsx is executable
    if [ -x "node_modules/.bin/tsx" ]; then
        print_success "tsx binary is executable"
    else
        print_warning "tsx binary may not be executable"
    fi
    
    # Check pnpm version
    print_info "pnpm version:"
    pnpm --version
    
    # Check node version
    print_info "Node.js version:"
    node --version
    
    echo ""
    
    # Step 5: Final instructions
    print_header "Setup Complete!"
    
    echo -e "${GREEN}You can now run:${NC}"
    echo "  pnpm dev"
    echo ""
    echo -e "${YELLOW}If you still get permission errors:${NC}"
    echo "  1. Check file ownership: ls -la node_modules/.bin/next"
    echo "  2. Ensure correct user owns files: sudo chown -R \$(whoami) ."
    echo "  3. Try with sudo: sudo pnpm dev"
    echo ""
    
}

# Run main script
main "$@"
