#!/bin/bash

# ============================================================================
# AI Personal Assistant - Interactive Setup Script
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}$1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

press_enter() {
    echo ""
    read -p "Press Enter to continue..."
}

# Check if a command exists
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Generate a random string
generate_secret() {
    openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"

    local all_good=true

    # Node.js
    if check_command node; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 20 ]; then
            print_success "Node.js $(node -v)"
        else
            print_warning "Node.js $(node -v) - v20+ recommended"
        fi
    else
        print_error "Node.js not found - Install from https://nodejs.org"
        all_good=false
    fi

    # npm
    if check_command npm; then
        print_success "npm $(npm -v)"
    else
        print_error "npm not found"
        all_good=false
    fi

    # PostgreSQL
    if check_command psql; then
        print_success "PostgreSQL (psql) available"
    else
        print_warning "PostgreSQL client (psql) not found - needed for database"
    fi

    # Redis
    if check_command redis-cli; then
        print_success "Redis CLI available"
    else
        print_warning "Redis CLI not found - Redis is needed for caching"
    fi

    # Git
    if check_command git; then
        print_success "Git $(git --version | cut -d' ' -f3)"
    else
        print_warning "Git not found"
    fi

    # OpenSSL (for secret generation)
    if check_command openssl; then
        print_success "OpenSSL available"
    else
        print_warning "OpenSSL not found - secrets will use fallback method"
    fi

    echo ""
    if [ "$all_good" = false ]; then
        print_error "Some required prerequisites are missing."
        return 1
    fi
    return 0
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

setup_environment() {
    print_header "Environment Configuration"

    if [ -f .env ]; then
        print_warning ".env file already exists"
        read -p "Overwrite with fresh configuration? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return 0
        fi
    fi

    print_info "Creating .env from template..."
    cp .env.example .env

    echo ""
    echo -e "${BOLD}Let's configure your environment:${NC}"
    echo ""

    # Generate secrets
    print_info "Generating secure secrets..."
    local jwt_secret=$(generate_secret)
    local refresh_secret=$(generate_secret)
    local encryption_key=$(generate_secret | cut -c1-64)
    local remote_secret=$(generate_secret)

    # Update .env with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
        sed -i '' "s/REFRESH_TOKEN_SECRET=.*/REFRESH_TOKEN_SECRET=$refresh_secret/" .env
        sed -i '' "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$encryption_key/" .env
        sed -i '' "s/REMOTE_AGENT_SECRET=.*/REMOTE_AGENT_SECRET=$remote_secret/" .env
    else
        # Linux
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
        sed -i "s/REFRESH_TOKEN_SECRET=.*/REFRESH_TOKEN_SECRET=$refresh_secret/" .env
        sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$encryption_key/" .env
        sed -i "s/REMOTE_AGENT_SECRET=.*/REMOTE_AGENT_SECRET=$remote_secret/" .env
    fi

    print_success "Security secrets generated"

    # Database configuration
    echo ""
    echo -e "${BOLD}Database Configuration:${NC}"
    read -p "PostgreSQL username [postgres]: " db_user
    db_user=${db_user:-postgres}

    read -p "PostgreSQL password: " -s db_pass
    echo ""

    read -p "PostgreSQL host [localhost]: " db_host
    db_host=${db_host:-localhost}

    read -p "PostgreSQL port [5432]: " db_port
    db_port=${db_port:-5432}

    read -p "Database name [ai_assistant]: " db_name
    db_name=${db_name:-ai_assistant}

    local db_url="postgresql://$db_user:$db_pass@$db_host:$db_port/$db_name"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=$db_url|" .env
    else
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=$db_url|" .env
    fi

    print_success "Database configuration saved"

    # Redis configuration
    echo ""
    echo -e "${BOLD}Redis Configuration:${NC}"
    read -p "Redis URL [redis://localhost:6379]: " redis_url
    redis_url=${redis_url:-redis://localhost:6379}

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|REDIS_URL=.*|REDIS_URL=$redis_url|" .env
    else
        sed -i "s|REDIS_URL=.*|REDIS_URL=$redis_url|" .env
    fi

    print_success "Redis configuration saved"

    # Optional API keys
    echo ""
    echo -e "${BOLD}API Keys (optional - press Enter to skip):${NC}"

    read -p "OpenAI API Key: " -s openai_key
    echo ""
    if [ -n "$openai_key" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$openai_key/" .env
        else
            sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$openai_key/" .env
        fi
        print_success "OpenAI API key saved"
    fi

    read -p "Twilio Account SID: " twilio_sid
    if [ -n "$twilio_sid" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/TWILIO_ACCOUNT_SID=.*/TWILIO_ACCOUNT_SID=$twilio_sid/" .env
        else
            sed -i "s/TWILIO_ACCOUNT_SID=.*/TWILIO_ACCOUNT_SID=$twilio_sid/" .env
        fi
    fi

    read -p "Twilio Auth Token: " -s twilio_token
    echo ""
    if [ -n "$twilio_token" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/TWILIO_AUTH_TOKEN=.*/TWILIO_AUTH_TOKEN=$twilio_token/" .env
        else
            sed -i "s/TWILIO_AUTH_TOKEN=.*/TWILIO_AUTH_TOKEN=$twilio_token/" .env
        fi
        print_success "Twilio credentials saved"
    fi

    echo ""
    print_success "Environment configuration complete!"
    print_info "You can edit .env later to add more API keys (ElevenLabs, Picovoice, etc.)"
}

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

install_backend() {
    print_header "Installing Backend Dependencies"

    print_info "Installing npm packages..."
    npm install

    if [ $? -eq 0 ]; then
        print_success "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        return 1
    fi
}

install_web() {
    print_header "Installing Web Dashboard Dependencies"

    if [ -d "web" ]; then
        print_info "Installing web dashboard packages..."
        cd web
        npm install
        cd ..

        if [ $? -eq 0 ]; then
            print_success "Web dashboard dependencies installed"
        else
            print_error "Failed to install web dashboard dependencies"
            return 1
        fi
    else
        print_warning "Web dashboard directory not found"
    fi
}

install_desktop() {
    print_header "Installing Desktop Agent Dependencies"

    if [ -d "desktop-agent" ]; then
        print_info "Installing desktop agent packages..."
        cd desktop-agent
        npm install
        cd ..

        if [ $? -eq 0 ]; then
            print_success "Desktop agent dependencies installed"
        else
            print_error "Failed to install desktop agent dependencies"
            return 1
        fi
    else
        print_warning "Desktop agent directory not found"
    fi
}

install_all() {
    install_backend
    install_web
    install_desktop
}

# ============================================================================
# DATABASE SETUP
# ============================================================================

setup_database() {
    print_header "Database Setup"

    # Check if .env exists
    if [ ! -f .env ]; then
        print_error ".env file not found. Run environment setup first."
        return 1
    fi

    # Source the .env file to get DATABASE_URL
    export $(grep -v '^#' .env | xargs)

    echo -e "${BOLD}Database Options:${NC}"
    echo "  1) Create database (if it doesn't exist)"
    echo "  2) Run migrations"
    echo "  3) Both (create + migrate)"
    echo "  4) Skip"
    echo ""
    read -p "Choose an option [3]: " db_choice
    db_choice=${db_choice:-3}

    case $db_choice in
        1|3)
            print_info "Attempting to create database..."
            # Extract database name from URL
            db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

            # Try to create database (will fail silently if exists)
            createdb "$db_name" 2>/dev/null && print_success "Database '$db_name' created" || print_info "Database may already exist"

            if [ "$db_choice" = "3" ]; then
                print_info "Running migrations..."
                npm run migrate:up
                if [ $? -eq 0 ]; then
                    print_success "Migrations complete"
                else
                    print_error "Migration failed"
                    return 1
                fi
            fi
            ;;
        2)
            print_info "Running migrations..."
            npm run migrate:up
            if [ $? -eq 0 ]; then
                print_success "Migrations complete"
            else
                print_error "Migration failed"
                return 1
            fi
            ;;
        4)
            print_info "Skipping database setup"
            ;;
        *)
            print_warning "Invalid option, skipping"
            ;;
    esac
}

# ============================================================================
# BUILD PROJECTS
# ============================================================================

build_backend() {
    print_header "Building Backend"

    print_info "Compiling TypeScript..."
    npm run build

    if [ $? -eq 0 ]; then
        print_success "Backend built successfully"
    else
        print_error "Backend build failed"
        return 1
    fi
}

build_web() {
    print_header "Building Web Dashboard"

    if [ -d "web" ]; then
        print_info "Building web dashboard..."
        cd web
        npm run build
        local result=$?
        cd ..

        if [ $result -eq 0 ]; then
            print_success "Web dashboard built successfully"
        else
            print_error "Web dashboard build failed"
            return 1
        fi
    else
        print_warning "Web dashboard directory not found"
    fi
}

build_desktop() {
    print_header "Building Desktop Agent"

    if [ -d "desktop-agent" ]; then
        print_info "Building desktop agent..."
        cd desktop-agent
        npm run build
        local result=$?
        cd ..

        if [ $result -eq 0 ]; then
            print_success "Desktop agent built successfully"
        else
            print_error "Desktop agent build failed"
            return 1
        fi
    else
        print_warning "Desktop agent directory not found"
    fi
}

build_all() {
    build_backend
    build_web
    build_desktop
}

# ============================================================================
# RUN SERVICES
# ============================================================================

run_backend() {
    print_header "Starting Backend Server"
    print_info "Starting on http://localhost:3000..."
    print_info "Press Ctrl+C to stop"
    echo ""
    npm run dev
}

run_web() {
    print_header "Starting Web Dashboard"

    if [ -d "web" ]; then
        print_info "Starting on http://localhost:5173..."
        print_info "Press Ctrl+C to stop"
        echo ""
        cd web
        npm run dev
        cd ..
    else
        print_error "Web dashboard directory not found"
    fi
}

run_all_dev() {
    print_header "Starting All Services (Development)"

    print_info "Starting backend on http://localhost:3000"
    print_info "Starting web dashboard on http://localhost:5173"
    echo ""

    # Check if we can use concurrently or need to background
    if check_command concurrently; then
        concurrently "npm run dev" "cd web && npm run dev"
    else
        print_info "Starting backend in background..."
        npm run dev &
        BACKEND_PID=$!

        print_info "Starting web dashboard..."
        cd web
        npm run dev &
        WEB_PID=$!
        cd ..

        echo ""
        print_success "Services started!"
        echo ""
        echo -e "${BOLD}URLs:${NC}"
        echo "  Backend:   http://localhost:3000"
        echo "  Dashboard: http://localhost:5173"
        echo ""
        echo "Process IDs: Backend=$BACKEND_PID, Web=$WEB_PID"
        echo "Press Ctrl+C to stop all services"

        # Wait for user interrupt
        trap "kill $BACKEND_PID $WEB_PID 2>/dev/null; exit" SIGINT SIGTERM
        wait
    fi
}

# ============================================================================
# RUN TESTS
# ============================================================================

run_tests() {
    print_header "Running Tests"

    echo -e "${BOLD}Test Options:${NC}"
    echo "  1) Run all unit tests"
    echo "  2) Run tests with coverage"
    echo "  3) Run tests in watch mode"
    echo "  4) Run E2E tests"
    echo "  5) Back"
    echo ""
    read -p "Choose an option [1]: " test_choice
    test_choice=${test_choice:-1}

    case $test_choice in
        1)
            npm test
            ;;
        2)
            npm run test:coverage
            ;;
        3)
            npm run test:watch
            ;;
        4)
            npm run test:e2e
            ;;
        5)
            return 0
            ;;
        *)
            print_warning "Invalid option"
            ;;
    esac
}

# ============================================================================
# QUICK SETUP
# ============================================================================

quick_setup() {
    print_header "Quick Setup - Full Installation"

    echo "This will:"
    echo "  1. Check prerequisites"
    echo "  2. Configure environment"
    echo "  3. Install all dependencies"
    echo "  4. Setup database"
    echo "  5. Build all projects"
    echo ""
    read -p "Continue? (Y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        return 0
    fi

    check_prerequisites || { print_error "Prerequisites check failed"; return 1; }
    setup_environment
    install_all
    setup_database
    build_all

    print_header "Setup Complete!"

    echo -e "${BOLD}Quick Start Commands:${NC}"
    echo ""
    echo "  Start backend (dev):     npm run dev"
    echo "  Start web dashboard:     cd web && npm run dev"
    echo "  Start both:              ./setup.sh  (then choose 'Start Services')"
    echo ""
    echo "  Run tests:               npm test"
    echo "  Build for production:    npm run build"
    echo ""
    echo -e "${BOLD}URLs:${NC}"
    echo "  Backend API:    http://localhost:3000"
    echo "  Web Dashboard:  http://localhost:5173"
    echo "  API Health:     http://localhost:3000/health"
    echo ""
}

# ============================================================================
# MAIN MENU
# ============================================================================

show_menu() {
    clear
    echo -e "${CYAN}"
    echo "    ╔═══════════════════════════════════════════════════════════╗"
    echo "    ║                                                           ║"
    echo "    ║      🤖  AI Personal Assistant - Setup & Management       ║"
    echo "    ║                                                           ║"
    echo "    ╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BOLD}  Setup${NC}"
    echo "    1)  Quick Setup (recommended for first time)"
    echo "    2)  Check Prerequisites"
    echo "    3)  Configure Environment (.env)"
    echo ""
    echo -e "${BOLD}  Install${NC}"
    echo "    4)  Install All Dependencies"
    echo "    5)  Install Backend Only"
    echo "    6)  Install Web Dashboard Only"
    echo ""
    echo -e "${BOLD}  Database${NC}"
    echo "    7)  Database Setup (create + migrate)"
    echo ""
    echo -e "${BOLD}  Build${NC}"
    echo "    8)  Build All Projects"
    echo "    9)  Build Backend Only"
    echo "   10)  Build Web Dashboard Only"
    echo ""
    echo -e "${BOLD}  Run${NC}"
    echo "   11)  Start All Services (dev mode)"
    echo "   12)  Start Backend Only"
    echo "   13)  Start Web Dashboard Only"
    echo ""
    echo -e "${BOLD}  Test${NC}"
    echo "   14)  Run Tests"
    echo ""
    echo -e "${BOLD}  Other${NC}"
    echo "    q)  Quit"
    echo ""
}

main() {
    # If argument provided, run that command directly
    if [ $# -gt 0 ]; then
        case "$1" in
            "quick"|"--quick"|"-q")
                quick_setup
                exit 0
                ;;
            "check"|"--check")
                check_prerequisites
                exit 0
                ;;
            "install"|"--install"|"-i")
                install_all
                exit 0
                ;;
            "build"|"--build"|"-b")
                build_all
                exit 0
                ;;
            "dev"|"--dev"|"-d")
                run_all_dev
                exit 0
                ;;
            "test"|"--test"|"-t")
                npm test
                exit 0
                ;;
            "help"|"--help"|"-h")
                echo "AI Personal Assistant Setup Script"
                echo ""
                echo "Usage: ./setup.sh [command]"
                echo ""
                echo "Commands:"
                echo "  (none)    Interactive menu"
                echo "  quick     Full quick setup"
                echo "  check     Check prerequisites"
                echo "  install   Install all dependencies"
                echo "  build     Build all projects"
                echo "  dev       Start all services in dev mode"
                echo "  test      Run tests"
                echo "  help      Show this help"
                exit 0
                ;;
        esac
    fi

    # Interactive menu
    while true; do
        show_menu
        read -p "  Select an option: " choice

        case $choice in
            1)  quick_setup; press_enter ;;
            2)  check_prerequisites; press_enter ;;
            3)  setup_environment; press_enter ;;
            4)  install_all; press_enter ;;
            5)  install_backend; press_enter ;;
            6)  install_web; press_enter ;;
            7)  setup_database; press_enter ;;
            8)  build_all; press_enter ;;
            9)  build_backend; press_enter ;;
            10) build_web; press_enter ;;
            11) run_all_dev ;;
            12) run_backend ;;
            13) run_web ;;
            14) run_tests; press_enter ;;
            q|Q)
                echo ""
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_warning "Invalid option"
                press_enter
                ;;
        esac
    done
}

# Run main
main "$@"
