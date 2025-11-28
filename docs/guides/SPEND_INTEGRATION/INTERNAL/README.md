# SPEND Integration - Internal Documentation

This folder contains **internal production documentation** for WeSplit developers maintaining the SPEND payment gateway integration.

## 📁 Files

### **EXTERNAL_WEB_APP_INTEGRATION.md**
Complete internal implementation guide covering:
- Detailed data flow documentation
- Security implementation specifics
- User account and split creation logic
- Firebase Functions architecture
- Error handling and edge cases
- Performance optimization details

---

## 🔒 Production Maintenance

### Active Monitoring
- **API Performance**: Response times and success rates
- **Webhook Reliability**: Delivery tracking and retry logic
- **Security**: Authentication failures and rate limiting
- **Data Integrity**: Firestore consistency checks

### Code Locations
- **Backend**: `services/integrations/spend/` - Core services
- **Firebase**: `services/firebase-functions/src/spend*.js` - Cloud functions
- **Frontend**: `src/screens/SpendSplit/` - User interface
- **Types**: `src/services/integrations/spend/SpendTypes.ts` - Type definitions

### Key Components
- **SpendMerchantPaymentService**: Treasury wallet payments
- **SpendWebhookService**: Bidirectional webhook communication
- **SpendPaymentModeService**: Payment mode detection
- **SpendSplitScreen**: React Native user interface

---

## 🚨 Troubleshooting

### Common Issues
- **Webhook failures**: Check `spend_webhook_logs` collection
- **API authentication**: Verify API keys in `apiKeys` collection
- **Payment delays**: Check Firestore transaction logs
- **User matching**: Review `pending_invitations` collection

### Emergency Contacts
- **Production Issues**: Check Firebase Console monitoring
- **SPEND Coordination**: Webhook or data format issues
- **Security Incidents**: Immediate response required

---

**Status**: 🟢 Production Operational | **Last Updated**: 2025-11-28

