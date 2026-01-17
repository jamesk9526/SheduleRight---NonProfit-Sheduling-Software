#!/bin/bash
# ScheduleRight - Port Configuration Setup Script (Bash/Linux/Mac)
# This script helps configure all service ports during first-time setup

# Default ports
SERVER_PORT=${SERVER_PORT:-5710}
WEB_PORT=${WEB_PORT:-5711}
EMBED_PORT=${EMBED_PORT:-5712}
COUCHDB_PORT=${COUCHDB_PORT:-5713}
REDIS_PORT=${REDIS_PORT:-5714}

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

# Check if port is in use
check_port() {
    if command -v lsof &> /dev/null; then
        lsof -i ":$1" > /dev/null 2>&1
        return $?
    elif command -v netstat &> /dev/null; then
        netstat -tuln 2>/dev/null | grep ":$1 " > /dev/null 2>&1
        return $?
    else
        return 0  # Can't check, assume it's free
    fi
}

# Get interactive port input
get_interactive_port() {
    local service_name=$1
    local default_port=$2
    local port=$default_port
    
    while true; do
        echo -ne "${YELLOW}Enter port for $service_name (default: $default_port): ${NC}"
        read -r input
        
        if [ -z "$input" ]; then
            port=$default_port
            break
        fi
        
        # Validate input is a number
        if ! [[ "$input" =~ ^[0-9]+$ ]]; then
            print_error "Please enter a valid port number"
            continue
        fi
        
        # Validate port range
        if [ "$input" -lt 1024 ] || [ "$input" -gt 65535 ]; then
            print_error "Port must be between 1024 and 65535"
            continue
        fi
        
        # Check if port is in use
        if check_port "$input"; then
            print_error "Port $input is already in use. Please choose another port."
            continue
        fi
        
        port=$input
        break
    done
    
    echo "$port"
}

# Update .env file
update_env_file() {
    local filepath=$1
    local server_port=$2
    local couchdb_port=$3
    local redis_port=$4
    local web_port=$5
    local embed_port=$6
    
    if [ ! -f "$filepath" ]; then
        print_warning "File not found: $filepath (skipping)"
        return 0
    fi
    
    # Create backup
    cp "$filepath" "$filepath.backup"
    
    # Update ports using sed
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        sed -i '' "s/SERVER_PORT=[0-9]\+/SERVER_PORT=$server_port/" "$filepath"
        sed -i '' "s|SERVER_URL=http://localhost:[0-9]\+|SERVER_URL=http://localhost:$server_port|" "$filepath"
        sed -i '' "s|COUCHDB_URL=http://localhost:[0-9]\+|COUCHDB_URL=http://localhost:$couchdb_port|" "$filepath"
        sed -i '' "s|REDIS_URL=redis://localhost:[0-9]\+|REDIS_URL=redis://localhost:$redis_port|" "$filepath"
        sed -i '' "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:$web_port,http://localhost:$server_port,http://localhost:$embed_port|" "$filepath"
    else
        # Linux
        sed -i "s/SERVER_PORT=[0-9]\+/SERVER_PORT=$server_port/" "$filepath"
        sed -i "s|SERVER_URL=http://localhost:[0-9]\+|SERVER_URL=http://localhost:$server_port|" "$filepath"
        sed -i "s|COUCHDB_URL=http://localhost:[0-9]\+|COUCHDB_URL=http://localhost:$couchdb_port|" "$filepath"
        sed -i "s|REDIS_URL=redis://localhost:[0-9]\+|REDIS_URL=redis://localhost:$redis_port|" "$filepath"
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:$web_port,http://localhost:$server_port,http://localhost:$embed_port|" "$filepath"
    fi
}

# Update docker-compose file
update_docker_compose() {
    local filepath=$1
    local couchdb_port=$2
    local redis_port=$3
    
    if [ ! -f "$filepath" ]; then
        print_info "Docker Compose file not found: $filepath (skipping)"
        return 0
    fi
    
    # Create backup
    cp "$filepath" "$filepath.backup"
    
    # Update ports
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        sed -i '' "s|\"5984:5984\"|\"$couchdb_port:$couchdb_port\"|g" "$filepath"
        sed -i '' "s|'5984:5984'|'$couchdb_port:$couchdb_port'|g" "$filepath"
        sed -i '' "s|localhost:5984|localhost:$couchdb_port|g" "$filepath"
        sed -i '' "s|\"6379:6379\"|\"$redis_port:$redis_port\"|g" "$filepath"
        sed -i '' "s|'6379:6379'|'$redis_port:$redis_port'|g" "$filepath"
    else
        # Linux
        sed -i "s|\"5984:5984\"|\"$couchdb_port:$couchdb_port\"|g" "$filepath"
        sed -i "s|'5984:5984'|'$couchdb_port:$couchdb_port'|g" "$filepath"
        sed -i "s|localhost:5984|localhost:$couchdb_port|g" "$filepath"
        sed -i "s|\"6379:6379\"|\"$redis_port:$redis_port\"|g" "$filepath"
        sed -i "s|'6379:6379'|'$redis_port:$redis_port'|g" "$filepath"
    fi
}

# Main script
main() {
    print_header "ScheduleRight - Port Configuration Setup"
    
    print_info "This script configures service ports for your ScheduleRight installation."
    print_info "Default configuration uses ports 5710-5715."
    
    # Check if running interactively or with arguments
    if [ "$1" == "--interactive" ] || [ "$1" == "-i" ]; then
        print_header "Port Configuration (Interactive)"
        print_info "Leave blank to accept defaults"
        
        SERVER_PORT=$(get_interactive_port "Node.js Server (API)" "$SERVER_PORT")
        WEB_PORT=$(get_interactive_port "Web App (UI)" "$WEB_PORT")
        EMBED_PORT=$(get_interactive_port "Embed Widget" "$EMBED_PORT")
        COUCHDB_PORT=$(get_interactive_port "CouchDB" "$COUCHDB_PORT")
        REDIS_PORT=$(get_interactive_port "Redis" "$REDIS_PORT")
    else
        print_info "Using default ports. Run with --interactive (-i) for custom configuration."
    fi
    
    # Display configuration summary
    print_header "Port Configuration Summary"
    echo -e "Node.js Server (API):  ${GREEN}localhost:$SERVER_PORT${NC}"
    echo -e "Web App (UI):          ${GREEN}localhost:$WEB_PORT${NC}"
    echo -e "Embed Widget:          ${GREEN}localhost:$EMBED_PORT${NC}"
    echo -e "CouchDB:               ${GREEN}localhost:$COUCHDB_PORT${NC}"
    echo -e "Redis:                 ${GREEN}localhost:$REDIS_PORT${NC}"
    
    print_header "Updating Configuration Files"
    
    # Update .env file
    print_info "Updating apps/server/.env..."
    if update_env_file "apps/server/.env" "$SERVER_PORT" "$COUCHDB_PORT" "$REDIS_PORT" "$WEB_PORT" "$EMBED_PORT"; then
        print_success "Updated apps/server/.env"
    fi
    
    # Update docker-compose files
    print_info "Updating docker-compose.yml..."
    if update_docker_compose "docker-compose.yml" "$COUCHDB_PORT" "$REDIS_PORT"; then
        print_success "Updated docker-compose.yml"
    fi
    
    print_info "Updating infra/docker-compose.yml..."
    if update_docker_compose "infra/docker-compose.yml" "$COUCHDB_PORT" "$REDIS_PORT"; then
        print_success "Updated infra/docker-compose.yml"
    fi
    
    print_header "Setup Complete"
    echo -e "${GREEN}Configuration files have been updated successfully!${NC}"
    
    print_info "Next steps:"
    print_info "1. Start services: pnpm dev"
    print_info "2. Access web app: http://localhost:$WEB_PORT"
    print_info "3. Access API: http://localhost:$SERVER_PORT/health"
    print_info "4. Initialize DB: http://localhost:$SERVER_PORT/api/v1/bootstrap"
    echo ""
}

# Run main script
main "$@"
