# Solana Mainnet RPC Provider Comparison & Recommendations

## Executive Summary

This document compares free and paid Solana RPC providers to help optimize mainnet transaction performance. The goal is to achieve devnet-like speed on mainnet by using fast, reliable providers with generous free tiers.

---

## Current Provider Analysis

### Currently Using (in order):
1. **Helius** (with API key) - Good, but rate limited
2. **Solana Official RPC** (`api.mainnet-beta.solana.com`) - Heavy rate limiting, slow
3. **Project Serum** - Rate limited, unreliable
4. **Ankr** - Rate limited
5. **Alchemy Demo** - Very limited, rate limited

**Issues:**
- ❌ Heavy rate limiting (HTTP 429 errors)
- ❌ Slow response times (1-5 seconds, sometimes 10+ seconds)
- ❌ Delayed transaction indexing (5-15 seconds)
- ❌ Multiple unreliable endpoints

---

## Recommended Free Tier Providers (Fastest First)

### 1. **QuickNode** ⭐ RECOMMENDED
- **Free Tier**: 1 month free trial, then paid plans start at $42/month
- **Performance**: 72ms latency, 99.99% uptime
- **Rate Limits**: Generous limits on paid plans, free trial has good limits
- **Setup**: Requires account creation, get API key
- **Endpoint Format**: `https://YOUR-ENDPOINT.solana-mainnet.quiknode.pro/YOUR-API-KEY/`
- **Pros**: 
  - Very fast (72ms latency)
  - High reliability (99.99% uptime)
  - Good free trial period
  - Excellent documentation
- **Cons**: 
  - Requires account setup
  - Free tier is limited to 1 month
- **Best For**: Production apps that need reliability

### 2. **Alchemy** ⭐ RECOMMENDED (with API key)
- **Free Tier**: 30M compute units/month (very generous)
- **Performance**: Sub-50ms latency globally
- **Rate Limits**: Generous on free tier
- **Setup**: Free account, get API key
- **Endpoint Format**: `https://solana-mainnet.g.alchemy.com/v2/YOUR-API-KEY`
- **Pros**: 
  - Very generous free tier (30M CU/month)
  - Fast (sub-50ms latency)
  - Global CDN for low latency
  - Currently using demo endpoint (limited) - upgrade to API key
- **Cons**: 
  - Requires account setup
  - Demo endpoint is very limited
- **Best For**: Apps with moderate to high usage

### 3. **GetBlock** ⭐ RECOMMENDED
- **Free Tier**: Free plan with 24-hour response support
- **Performance**: 16-21ms latency from key regions, 95% confirmations < 0.5s
- **Rate Limits**: Reasonable on free tier
- **Setup**: Free account, get API key
- **Endpoint Format**: `https://sol.getblock.io/mainnet/?api_key=YOUR-API-KEY`
- **Pros**: 
  - Extremely fast (16-21ms latency)
  - Fast confirmations (95% < 0.5s)
  - Free tier available
  - Good for Solana
- **Cons**: 
  - Requires account setup
- **Best For**: Apps needing fastest possible response times

### 4. **Chainstack** ⭐ RECOMMENDED
- **Free Tier**: Free tier with access to multiple chains
- **Performance**: Low latency, enterprise-grade reliability
- **Rate Limits**: Reasonable on free tier
- **Setup**: Free account, get API key
- **Endpoint Format**: `https://YOUR-ENDPOINT.solana-mainnet.chainstack.com/YOUR-API-KEY`
- **Pros**: 
  - Flat-fee pricing (predictable costs)
  - Low latency
  - Enterprise-grade reliability
  - Free tier available
- **Cons**: 
  - Requires account setup
- **Best For**: Apps needing predictable costs

### 5. **Triton** (Solana-focused)
- **Free Tier**: Limited free tier available
- **Performance**: Optimized for Solana
- **Rate Limits**: Moderate on free tier
- **Setup**: Free account, get API key
- **Endpoint Format**: `https://YOUR-ENDPOINT.rpcpool.com/YOUR-API-KEY`
- **Pros**: 
  - Solana-focused provider
  - Good performance
  - Free tier available
- **Cons**: 
  - Less well-known
  - Requires account setup
- **Best For**: Solana-specific apps

### 6. **Helius** (Already Using)
- **Free Tier**: Limited free tier, paid plans available
- **Performance**: Good performance with API key
- **Rate Limits**: Better with API key than without
- **Endpoint Format**: `https://mainnet.helius-rpc.com/?api-key=YOUR-API-KEY`
- **Pros**: 
  - Already configured
  - Good performance with API key
  - Solana-focused
- **Cons**: 
  - Rate limited without proper tier
- **Best For**: Already using, keep as backup

---

## Recommended Provider Priority Order

### For Free Tier (No API Keys Required):
1. **Ankr** - `https://rpc.ankr.com/solana` (already using, keep)
2. **Solana Official** - `https://api.mainnet-beta.solana.com` (keep as last resort)
3. **Project Serum** - `https://solana-api.projectserum.com` (keep as backup)

### For Free Tier (With API Keys - RECOMMENDED):
1. **Alchemy** (with API key) - ⭐ **BEST FREE TIER** - 30M CU/month
2. **GetBlock** (with API key) - ⭐ **FASTEST** - 16-21ms latency
3. **QuickNode** (with API key) - ⭐ **MOST RELIABLE** - 99.99% uptime
4. **Chainstack** (with API key) - Good balance
5. **Helius** (with API key) - Already using, keep
6. **Triton** (with API key) - Solana-focused

---

## Recommended Configuration Update

### Priority Order (Fastest & Most Reliable First):

```typescript
rpcEndpoints: [
  // Tier 1: Fast free providers with API keys (if available)
  ...(alchemyApiKey ? [`https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`] : []),
  ...(getBlockApiKey ? [`https://solana-mainnet.getblock.io/${getBlockApiKey}`] : []),
  ...(quickNodeApiKey ? [`https://YOUR-ENDPOINT.solana-mainnet.quiknode.pro/${quickNodeApiKey}`] : []),
  ...(chainstackApiKey ? [`https://YOUR-ENDPOINT.solana-mainnet.chainstack.com/${chainstackApiKey}`] : []),
  
  // Tier 2: Helius (already configured)
  ...(heliusApiKey ? [`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`] : []),
  
  // Tier 3: Free providers without API keys (fallback)
  'https://rpc.ankr.com/solana',
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  
  // Tier 4: Last resort
  'https://solana-mainnet.g.alchemy.com/v2/demo' // Very limited
]
```

---

## Performance Comparison

| Provider | Latency | Free Tier | Rate Limits | Reliability | Setup Required |
|----------|---------|-----------|--------------|-------------|----------------|
| **GetBlock** | 16-21ms | ✅ Yes | Moderate | High | API Key |
| **Alchemy** | <50ms | ✅ 30M CU/mo | Generous | High | API Key |
| **QuickNode** | 72ms | ✅ 1mo trial | Good | 99.99% | API Key |
| **Chainstack** | Low | ✅ Yes | Moderate | High | API Key |
| **Helius** | Good | ⚠️ Limited | Moderate | Good | API Key |
| **Ankr** | Moderate | ✅ Yes | Heavy | Moderate | None |
| **Solana Official** | Slow | ✅ Yes | Very Heavy | Moderate | None |
| **Project Serum** | Slow | ✅ Yes | Heavy | Low | None |

---

## Implementation Recommendations

### 1. **Immediate Actions (Free, No Setup)**
   - Keep current providers but reorder by reliability
   - Remove unreliable providers (Project Serum if causing issues)
   - Add Ankr as primary free fallback

### 2. **Short-term (Free API Keys)**
   - **Priority 1**: Get Alchemy API key (30M CU/month free tier)
   - **Priority 2**: Get GetBlock API key (fastest latency)
   - **Priority 3**: Get QuickNode API key (most reliable)

### 3. **Long-term (If Needed)**
   - Consider paid plans if free tiers are insufficient
   - QuickNode: $42/month for production
   - Alchemy: Pay-as-you-go after free tier
   - GetBlock: Paid plans available

---

## Rate Limit Handling Strategy

### Current Issues:
- HTTP 429 errors common
- Can't poll frequently enough
- Verification timeouts

### Solutions:
1. **Use providers with generous free tiers** (Alchemy, GetBlock)
2. **Implement smart endpoint rotation** (rotate on rate limit)
3. **Exponential backoff** (already implemented)
4. **Reduce polling frequency** (already implemented for mainnet)
5. **Use WebSocket subscriptions** (if available from provider)

---

## Getting API Keys (Free)

### Alchemy (Recommended - Best Free Tier)
1. Go to https://www.alchemy.com/
2. Sign up for free account
3. Create new app → Select Solana Mainnet
4. Copy API key
5. Add to environment: `EXPO_PUBLIC_ALCHEMY_API_KEY`

### GetBlock (Recommended - Fastest)
1. Go to https://getblock.io/
2. Sign up for free account
3. Create API key for Solana Mainnet
4. Copy API key
5. Add to environment: `EXPO_PUBLIC_GETBLOCK_API_KEY`

### QuickNode (Recommended - Most Reliable)
1. Go to https://www.quiknode.com/
2. Sign up for free account
3. Create endpoint → Select Solana Mainnet
4. Copy endpoint URL (includes API key)
5. Add to environment: `EXPO_PUBLIC_QUICKNODE_ENDPOINT`

### Chainstack
1. Go to https://chainstack.com/
2. Sign up for free account
3. Create project → Add Solana Mainnet
4. Copy endpoint URL
5. Add to environment: `EXPO_PUBLIC_CHAINSTACK_ENDPOINT`

---

## Expected Performance Improvements

### Before (Current):
- Response time: 1-5 seconds (sometimes 10+ seconds)
- Rate limit errors: Frequent (HTTP 429)
- Transaction verification: 15-40 seconds
- Success rate: ~70-80% (due to rate limits)

### After (With Recommended Providers):
- Response time: 50-200ms (with API keys)
- Rate limit errors: Rare (with generous free tiers)
- Transaction verification: 5-15 seconds (faster indexing)
- Success rate: ~95%+ (better reliability)

---

## Migration Plan

### Phase 1: Immediate (No Changes Required)
- Reorder existing endpoints by reliability
- Remove unreliable providers if causing issues

### Phase 2: Add Free API Keys (Recommended)
1. Get Alchemy API key (30M CU/month free)
2. Get GetBlock API key (fastest)
3. Update configuration
4. Test and monitor

### Phase 3: Optimize (If Needed)
1. Add QuickNode for reliability
2. Add Chainstack for backup
3. Fine-tune endpoint rotation
4. Monitor performance

---

## Conclusion

**Best Free Tier Options:**
1. **Alchemy** - Best overall (30M CU/month, fast, reliable)
2. **GetBlock** - Fastest (16-21ms latency)
3. **QuickNode** - Most reliable (99.99% uptime)

**Recommendation**: Start with Alchemy API key (easiest to get, most generous free tier), then add GetBlock for speed, and QuickNode for reliability. This combination should give you devnet-like performance on mainnet.

