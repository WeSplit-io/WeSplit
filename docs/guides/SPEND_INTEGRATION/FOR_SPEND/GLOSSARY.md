# Glossary

## SPEND Integration Terms

### Core Concepts
- **SPEND**: External e-commerce platform for Amazon purchases with USDC
- **WeSplit**: Social payment splitting platform for crypto transactions
- **Split**: A payment group where participants share costs
- **Treasury Wallet**: SPEND's wallet address for receiving payments
- **Merchant Gateway**: Payment mode for e-commerce integrations

### Technical Terms
- **Webhook**: HTTP callback for real-time notifications
- **HMAC-SHA256**: Signature algorithm for webhook security
- **API Key**: Authentication token for API access
- **Rate Limiting**: Request throttling (100 req/15min)
- **Atomic Operations**: Database transactions that prevent inconsistencies

### Order Status Values
- **Created**: Order created, awaiting payment
- **Payment_Pending**: Payment transaction initiated
- **Funded**: Payment confirmed
- **Processing**: Order being processed
- **Paid**: Payment confirmed
- **Ordered**: Order placed with store
- **Shipped**: Order shipped
- **Delivered**: Order delivered
- **Completed**: Order completed
- **Cancelled**: Order cancelled

### API Endpoints
- **matchUsersByEmail**: Cross-reference user emails
- **batchInviteParticipants**: Bulk participant invitations
- **payParticipantShare**: Individual payment processing
- **getSplitStatus**: Real-time progress tracking
- **spendWebhook**: Order status notifications
