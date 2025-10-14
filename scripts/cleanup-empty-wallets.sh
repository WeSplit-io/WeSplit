#!/bin/bash

# Split Wallet Cleanup Script Runner
# 
# This script provides easy access to the split wallet cleanup functionality
# with common configurations and safety checks.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
DRY_RUN=true
CONFIRM=false
BATCH_SIZE=50
MIN_AGE=7
VERBOSE=false
SCRIPT_TYPE="advanced"
VERIFY_ONLY=false
SPECIFIC_WALLET=""
BURN_WALLETS=false
MIN_RENT_RECOVERY=0.001

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to show usage
show_usage() {
    echo "Split Wallet Cleanup Script Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run              Run in dry-run mode (default)"
    echo "  --execute              Actually delete data (requires confirmation)"
    echo "  --batch-size=N         Number of wallets to process in each batch (default: 50)"
    echo "  --min-age=N            Only delete wallets older than N days (default: 7)"
    echo "  --verbose              Show detailed output"
    echo "  --simple               Use simple cleanup script instead of advanced"
    echo "  --verify               Run on-chain balance verification only (no cleanup)"
    echo "  --wallet=ADDRESS       Verify specific wallet address"
    echo "  --burn-wallets         Burn empty wallets and recover rent to company wallet"
    echo "  --min-rent-recovery=N  Minimum SOL amount to recover per wallet (default: 0.001)"
    echo "  --help, -h             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Dry run with default settings"
    echo "  $0 --execute --min-age=30            # Delete wallets older than 30 days"
    echo "  $0 --dry-run --verbose --batch-size=100  # Dry run with custom batch size"
    echo "  $0 --simple --execute                # Use simple script and actually delete"
    echo "  $0 --verify --verbose                # Verify on-chain balances only"
    echo "  $0 --verify --wallet=ADDRESS         # Verify specific wallet address"
    echo "  $0 --burn-wallets --dry-run          # Dry run with wallet burning"
    echo "  $0 --burn-wallets --execute          # Burn wallets and recover rent"
    echo ""
    echo "Safety Notes:"
    echo "  - Always run with --dry-run first to see what would be deleted"
    echo "  - The script will ask for confirmation before deleting data"
    echo "  - Make sure you have proper Firebase and Solana RPC credentials"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if required packages are installed
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        print_error "Node modules not found. Please run 'npm install' first."
        exit 1
    fi
    
    # Check if Firebase config exists
    if [ ! -f "$PROJECT_ROOT/.env" ] && [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        print_warning "No .env file found. Make sure Firebase and Solana credentials are set."
    fi
    
    print_success "Prerequisites check completed"
}

# Function to run the cleanup script
run_cleanup() {
    local script_name
    if [ "$SCRIPT_TYPE" = "simple" ]; then
        script_name="cleanup-empty-split-wallets.js"
    else
        script_name="cleanup-empty-split-wallets-advanced.js"
    fi
    
    local script_path="$SCRIPT_DIR/$script_name"
    
    if [ ! -f "$script_path" ]; then
        print_error "Cleanup script not found: $script_path"
        exit 1
    fi
    
    # Build command arguments
    local args=()
    
    if [ "$DRY_RUN" = true ]; then
        args+=("--dry-run")
    fi
    
    if [ "$CONFIRM" = true ]; then
        args+=("--confirm")
    fi
    
    if [ "$VERBOSE" = true ]; then
        args+=("--verbose")
    fi
    
    if [ "$BURN_WALLETS" = true ]; then
        args+=("--burn-wallets")
        args+=("--min-rent-recovery=$MIN_RENT_RECOVERY")
    fi
    
    args+=("--batch-size=$BATCH_SIZE")
    args+=("--min-age=$MIN_AGE")
    
    print_info "Running cleanup script: $script_name"
    print_info "Arguments: ${args[*]}"
    echo ""
    
    # Change to project root directory
    cd "$PROJECT_ROOT"
    
    # Run the script
    node "$script_path" "${args[@]}"
}

# Function to run verification
run_verification() {
    local script_path="$SCRIPT_DIR/verify-onchain-balances.js"
    
    if [ ! -f "$script_path" ]; then
        print_error "Verification script not found: $script_path"
        exit 1
    fi
    
    # Build command arguments
    local args=()
    
    if [ "$VERBOSE" = true ]; then
        args+=("--verbose")
    fi
    
    args+=("--batch-size=$BATCH_SIZE")
    
    if [ -n "$SPECIFIC_WALLET" ]; then
        args+=("--wallet-address=$SPECIFIC_WALLET")
    fi
    
    print_info "Running on-chain balance verification"
    print_info "Arguments: ${args[*]}"
    echo ""
    
    # Change to project root directory
    cd "$PROJECT_ROOT"
    
    # Run the verification script
    node "$script_path" "${args[@]}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            CONFIRM=false
            shift
            ;;
        --execute)
            DRY_RUN=false
            CONFIRM=false
            shift
            ;;
        --batch-size=*)
            BATCH_SIZE="${1#*=}"
            shift
            ;;
        --min-age=*)
            MIN_AGE="${1#*=}"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --simple)
            SCRIPT_TYPE="simple"
            shift
            ;;
        --verify)
            VERIFY_ONLY=true
            shift
            ;;
        --wallet=*)
            SPECIFIC_WALLET="${1#*=}"
            shift
            ;;
        --burn-wallets)
            BURN_WALLETS=true
            shift
            ;;
        --min-rent-recovery=*)
            MIN_RENT_RECOVERY="${1#*=}"
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "🧹 Split Wallet Cleanup Script Runner"
    echo "======================================"
    echo ""
    
    # Show configuration
    print_info "Configuration:"
    echo "  Script Type: $SCRIPT_TYPE"
    echo "  Dry Run: $DRY_RUN"
    echo "  Batch Size: $BATCH_SIZE"
    echo "  Min Age: $MIN_AGE days"
    echo "  Verbose: $VERBOSE"
    echo "  Verify Only: $VERIFY_ONLY"
    echo "  Burn Wallets: $BURN_WALLETS"
    if [ -n "$SPECIFIC_WALLET" ]; then
        echo "  Specific Wallet: $SPECIFIC_WALLET"
    fi
    if [ "$BURN_WALLETS" = true ]; then
        echo "  Min Rent Recovery: $MIN_RENT_RECOVERY SOL"
    fi
    echo ""
    
    # Safety check for execute mode
    if [ "$DRY_RUN" = false ]; then
        print_warning "EXECUTE MODE: This will actually delete data!"
        echo ""
        read -p "Are you sure you want to proceed? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Operation cancelled by user"
            exit 0
        fi
    fi
    
    # Check prerequisites
    check_prerequisites
    echo ""
    
    # Run verification or cleanup
    if [ "$VERIFY_ONLY" = true ]; then
        run_verification
    else
        run_cleanup
    fi
    
    echo ""
    if [ "$VERIFY_ONLY" = true ]; then
        print_success "Verification completed!"
    else
        print_success "Cleanup script completed!"
    fi
}

# Run main function
main "$@"
