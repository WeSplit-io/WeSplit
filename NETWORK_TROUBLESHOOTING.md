# 🔧 Network Troubleshooting Guide

## 🚨 Issue: "Network request failed"

The error you're seeing means your React Native app can't reach the Python AI server. Here's how to fix it:

## ✅ **Solution Applied:**

I've updated the AI service to use your local IP address instead of localhost:

**Before:** `http://localhost:4000` ❌  
**After:** `http://192.168.1.75:4000` ✅

## 🧪 **Test the Fix:**

### 1. **Restart Your React Native App**
- Stop your Expo/React Native app
- Restart it to pick up the new configuration

### 2. **Test the Connection**
You can test the connection in your browser:
```
http://192.168.1.75:4000/health
```

Should return:
```json
{
  "status": "healthy",
  "ai_agent_ready": true,
  "api_key_configured": true
}
```

### 3. **Try Taking a Receipt Photo Again**
- The app should now connect to the AI service
- You should see: "🤖 AI is analyzing your receipt..."
- Then: "✅ Using AI analysis"

## 🔍 **If It Still Doesn't Work:**

### **Check 1: Server is Running**
```bash
cd AiAgent
py api_server.py
```
Should show: `Running on http://192.168.1.75:4000`

### **Check 2: Network Connectivity**
```bash
# Test from your computer
curl http://192.168.1.75:4000/health
```

### **Check 3: Same Network**
- Make sure your phone and computer are on the same WiFi network
- Your computer IP: `192.168.1.75`
- Your phone should be on the same `192.168.1.x` network

### **Check 4: Firewall**
- Windows Firewall might be blocking port 4000
- Try temporarily disabling Windows Firewall
- Or add an exception for port 4000

### **Check 5: IP Address Changed**
If your IP address changes, update it in:
```typescript
// In src/services/aiBillAnalysisService.ts
private static readonly BASE_URL = __DEV__ ? 'http://YOUR_NEW_IP:4000' : 'https://your-production-server.com';
```

## 🎯 **Expected Behavior After Fix:**

### **Success Logs:**
```
LOG  🔍 AIBillAnalysisService: Checking health at http://192.168.1.75:4000/health
LOG  ✅ AIBillAnalysisService: Health check response: {"status":"healthy","ai_agent_ready":true}
LOG  🤖 AIBillAnalysisService: Starting AI analysis for: file:///...
LOG  ✅ AI analysis successful!
```

### **User Experience:**
1. **Loading**: "🤖 AI is analyzing your receipt..."
2. **Success**: "✅ Using AI analysis"
3. **Real Data**: Actual merchant names, amounts, items

## 🚀 **Alternative Solutions:**

### **Option 1: Use ngrok (Tunnel)**
```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 4000

# Use the ngrok URL in your app
```

### **Option 2: Use Expo Dev Tools**
- In Expo Dev Tools, check "Use network address"
- This might help with network connectivity

### **Option 3: Production Deployment**
- Deploy the AI service to a cloud server
- Use HTTPS endpoint in production

## 📱 **Testing Steps:**

1. **Start AI Server**: `py api_server.py` in AiAgent folder
2. **Restart React Native App**: To pick up new configuration
3. **Take Receipt Photo**: Use camera feature
4. **Check Logs**: Should see successful AI connection
5. **Verify Results**: Real merchant data instead of mock data

## 🎉 **Success Indicators:**

- ✅ No "Network request failed" errors
- ✅ "AI analysis successful!" in logs
- ✅ Real merchant names and amounts
- ✅ Processing time 1-8 seconds
- ✅ "✅ Using AI analysis" message

---

**The fix should resolve your network connectivity issue!** Try restarting your React Native app and taking another receipt photo. 🤖✨
