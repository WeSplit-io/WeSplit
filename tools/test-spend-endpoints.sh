#!/bin/bash

# SPEND Integration Endpoints Test Script (Shell/Curl Version)
# 
# Tests all SPEND integration endpoints using curl commands.
# 
# Usage:
#   ./tools/test-spend-endpoints.sh [command]
# 
# Commands:
#   all          - Run all tests (default)
#   create       - Test createSplitFromPayment
#   invite       - Test batchInviteParticipants
#   pay          - Test payParticipantShare
#   status       - Test getSplitStatus
#   search       - Test searchKnownUsers
#   flow         - Test complete flow

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${SPEND_API_BASE_URL:-https://us-central1-wesplit-35186.cloudfunctions.net}"
API_KEY="${SPEND_API_KEY:-wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg}"
TREASURY_WALLET="2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp"

# Test state
SPLIT_ID=""
BILL_ID=""
USER_ID=""

# Helper functions
log() {
    echo -e "${1}"
}

log_section() {
    echo ""
    echo "============================================================"
    log "${CYAN}${1}${NC}"
    echo "============================================================"
}

log_success() {
    log "${GREEN}✅ ${1}${NC}"
}

log_error() {
    log "${RED}❌ ${1}${NC}"
}

log_info() {
    log "${BLUE}ℹ️  ${1}${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  ${1}${NC}"
}

# Make API request
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    local url="${BASE_URL}${endpoint}"
    local headers=(
        -H "Content-Type: application/json"
        -H "Authorization: Bearer ${API_KEY}"
    )
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET "${headers[@]}" "$url"
    else
        curl -s -X POST "${headers[@]}" -d "$data" "$url"
    fi
}

# Test 1: Create Split From Payment
test_create_split() {
    log_section "Test 1: Create Split From Payment"
    
    local order_id="test_order_$(date +%s)"
    local order_number="ORD-$(date +%s)"
    
    local invoice_id="INV-$(date +%s)"
    
    local payload=$(cat <<EOF
{
  "email": "creator@example.com",
  "invoiceId": "${invoice_id}",
  "amount": 100.00,
  "currency": "USDC",
  "merchant": {
    "name": "Test Store",
    "address": "123 Test St",
    "phone": "+1234567890"
  },
  "transactionDate": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "source": "spend",
  "walletAddress": "11111111111111111111111111111112",
  "items": [
    {
      "name": "Test Item 1",
      "price": 50.00,
      "quantity": 1
    },
    {
      "name": "Test Item 2",
      "price": 50.00,
      "quantity": 1
    }
  ],
  "metadata": {
    "treasuryWallet": "${TREASURY_WALLET}",
    "orderId": "${order_id}",
    "orderNumber": "${order_number}",
    "orderStatus": "Payment_Pending",
    "store": "amazon",
    "webhookUrl": "https://spend.example.com/webhook",
    "webhookSecret": "test_secret",
    "paymentThreshold": 1.0,
    "orderData": {
      "id": "${order_id}",
      "order_number": "${order_number}",
      "status": "Payment_Pending",
      "store": "amazon",
      "total_amount": 100.00,
      "items": [
        {
          "name": "Test Item 1",
          "price": 50.00,
          "quantity": 1
        },
        {
          "name": "Test Item 2",
          "price": 50.00,
          "quantity": 1
        }
      ],
      "user_wallet": "TestWallet12345678901234567890123456789012",
      "customer_email": "test@example.com",
      "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    }
  }
}
EOF
)
    
    log_info "Creating split for order: ${order_id}"
    log_info "Treasury wallet: ${TREASURY_WALLET}"
    
    local response=$(make_request "POST" "/createSplitFromPayment" "$payload")
    
    # Parse response
    local success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ')
    local split_id=$(echo "$response" | grep -o '"splitId":"[^"]*' | cut -d'"' -f4)
    local bill_id=$(echo "$response" | grep -o '"billId":"[^"]*' | cut -d'"' -f4)
    local user_id=$(echo "$response" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
    
    if [ "$success" = "true" ] && [ -n "$split_id" ]; then
        SPLIT_ID="$split_id"
        BILL_ID="$bill_id"
        USER_ID="$user_id"
        
        log_success "Split created successfully!"
        log_info "Split ID: ${SPLIT_ID}"
        log_info "Bill ID: ${BILL_ID}"
        log_info "User ID: ${USER_ID}"
        
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 0
    else
        log_error "Failed to create split"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 1
    fi
}

# Test 2: Batch Invite Participants
test_batch_invite() {
    log_section "Test 2: Batch Invite Participants"
    
    if [ -z "$SPLIT_ID" ]; then
        log_error "No split ID available. Run create test first."
        return 1
    fi
    
    local payload=$(cat <<EOF
{
  "splitId": "${SPLIT_ID}",
  "inviterId": "${USER_ID}",
  "inviterName": "Test Creator",
  "participants": [
    {
      "email": "participant1@example.com",
      "name": "Participant One",
      "amountOwed": 33.33
    },
    {
      "email": "participant2@example.com",
      "name": "Participant Two",
      "amountOwed": 33.33
    },
    {
      "email": "participant3@example.com",
      "name": "Participant Three",
      "amountOwed": 33.34
    }
  ]
}
EOF
)
    
    log_info "Inviting 3 participants to split: ${SPLIT_ID}"
    
    local response=$(make_request "POST" "/batchInviteParticipants" "$payload")
    
    local success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ')
    
    if [ "$success" = "true" ]; then
        log_success "Participants invited successfully!"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 0
    else
        log_error "Failed to invite participants"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 1
    fi
}

# Test 3: Pay Participant Share
test_pay_participant_share() {
    log_section "Test 3: Pay Participant Share"
    
    if [ -z "$SPLIT_ID" ] || [ -z "$USER_ID" ]; then
        log_error "No split ID or user ID available. Run create test first."
        return 1
    fi
    
    local tx_sig="test_tx_$(date +%s)_$(openssl rand -hex 4)"
    
    local payload=$(cat <<EOF
{
  "splitId": "${SPLIT_ID}",
  "participantId": "${USER_ID}",
  "amount": 33.33,
  "currency": "USDC",
  "transactionSignature": "${tx_sig}"
}
EOF
)
    
    log_info "Recording payment for participant: ${USER_ID}"
    log_info "Amount: 33.33 USDC"
    log_info "Transaction: ${tx_sig}"
    
    local response=$(make_request "POST" "/payParticipantShare" "$payload")
    
    local success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ')
    
    if [ "$success" = "true" ]; then
        log_success "Payment recorded successfully!"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 0
    else
        log_error "Failed to record payment"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 1
    fi
}

# Test 4: Get Split Status
test_get_split_status() {
    log_section "Test 4: Get Split Status"
    
    if [ -z "$SPLIT_ID" ]; then
        log_error "No split ID available. Run create test first."
        return 1
    fi
    
    log_info "Getting status for split: ${SPLIT_ID}"
    
    local response=$(make_request "GET" "/getSplitStatus?splitId=${SPLIT_ID}")
    
    local success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ')
    
    if [ "$success" = "true" ]; then
        log_success "Split status retrieved successfully!"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 0
    else
        log_error "Failed to get split status"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 1
    fi
}

# Test 5: Search Known Users
test_search_known_users() {
    log_section "Test 5: Search Known Users"
    
    local search_query="participant"
    
    log_info "Searching for users with query: ${search_query}"
    
    local response=$(make_request "GET" "/searchKnownUsers?query=${search_query}&limit=20")
    
    local success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ')
    
    if [ "$success" = "true" ]; then
        log_success "User search completed!"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 0
    else
        log_error "Failed to search users"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 1
    fi
}

# Test Complete Flow
test_complete_flow() {
    log_section "Complete SPEND Integration Flow Test"
    
    log_info "Step 1: Creating split..."
    test_create_split
    sleep 2
    
    log_info "Step 2: Inviting participants..."
    test_batch_invite || log_warning "Invite failed (may be expected)"
    sleep 2
    
    log_info "Step 3: Recording payment..."
    test_pay_participant_share || log_warning "Payment failed (may be expected)"
    sleep 2
    
    log_info "Step 4: Getting split status..."
    test_get_split_status || log_warning "Status check failed"
    
    log_section "Flow Test Complete"
    if [ -n "$SPLIT_ID" ]; then
        log_info "Test split ID: ${SPLIT_ID}"
        log_info "You can check this split in Firebase Console"
    fi
}

# Main
main() {
    local command="${1:-all}"
    
    log_section "SPEND Integration Endpoints Test Suite"
    log_info "Base URL: ${BASE_URL}"
    log_info "API Key: ${API_KEY:0:10}..."
    log_info "Command: ${command}"
    
    case "$command" in
        create)
            test_create_split
            ;;
        invite)
            test_batch_invite
            ;;
        pay)
            test_pay_participant_share
            ;;
        status)
            test_get_split_status
            ;;
        search)
            test_search_known_users
            ;;
        flow)
            test_complete_flow
            ;;
        all|*)
            log_section "Running All Tests"
            test_create_split
            sleep 2
            test_batch_invite
            sleep 2
            test_pay_participant_share
            sleep 2
            test_get_split_status
            sleep 1
            test_search_known_users
            ;;
    esac
    
    log_section "Test Suite Complete"
}

# Run main
main "$@"
