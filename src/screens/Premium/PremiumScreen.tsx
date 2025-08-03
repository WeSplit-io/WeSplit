import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { SubscriptionService, SubscriptionPlan, UserSubscription, PaymentMethod } from '../../services/subscriptionService';
import { solanaService } from '../../services/solanaTransactionService';
import styles from './styles';

const PremiumScreen = ({ navigation }: any) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { isConnected, sendTransaction } = useWallet();
  
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [premiumFeatures, setPremiumFeatures] = useState<any[]>([]);

  useEffect(() => {
    loadPremiumData();
  }, [currentUser]);

  const loadPremiumData = async () => {
    try {
      setLoading(true);
      
      // Load subscription plans
      const availablePlans = SubscriptionService.getAvailablePlans();
      setPlans(availablePlans);
      setSelectedPlan(availablePlans[0]?.id || null);
      
      // Load payment methods
      const availablePaymentMethods = SubscriptionService.getAvailablePaymentMethods();
      setPaymentMethods(availablePaymentMethods);
      setSelectedPaymentMethod(availablePaymentMethods[0]?.id || null);
      
      // Load premium features
      const features = SubscriptionService.getPremiumFeatures();
      setPremiumFeatures(features);
      
      // Load current subscription if user is logged in
      if (currentUser) {
        try {
          const subscription = await SubscriptionService.getUserSubscription(currentUser.id);
          setCurrentSubscription(subscription);
        } catch (error) {
          // No subscription found, which is fine
          setCurrentSubscription(null);
        }
      }
    } catch (error) {
      console.error('Error loading premium data:', error);
      Alert.alert('Error', 'Failed to load premium features');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to subscribe');
      return;
    }

    if (!isConnected) {
      Alert.alert('Error', 'Please connect your wallet to make payments');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setSubscribing(true);
      
      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
      if (!paymentMethod) {
        throw new Error('Invalid payment method');
      }

      // Convert USD price to crypto equivalent (simplified conversion)
      const cryptoAmount = plan.currency === 'USD' ? plan.price / 200 : plan.price; // Assuming SOL = $200
      const currency = paymentMethod.id.includes('usdc') ? 'USDC' : 'SOL';
      
      Alert.alert(
        'Confirm Payment',
        `Subscribe to ${plan.name} for ${currency === 'USDC' ? plan.price.toFixed(2) : cryptoAmount.toFixed(4)} ${currency}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay Now',
            onPress: async () => {
              try {
                // Generate a dummy recipient address for payment processing
                const dummyRecipient = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'; // Demo address
                
                // Send payment transaction
                const transactionResult = await sendTransaction({
                  to: dummyRecipient,
                  amount: currency === 'USDC' ? plan.price : cryptoAmount,
                  currency: currency,
                  memo: `WeSplit Premium: ${plan.name}`,
                  groupId: undefined
                });
                
                // Process the crypto payment on backend
                const paymentResult = await SubscriptionService.processCryptoPayment({
                  userId: currentUser.id,
                  planId: plan.id,
                  paymentMethod: selectedPaymentMethod,
                  amount: currency === 'USDC' ? plan.price : cryptoAmount,
                  currency: currency,
                  transactionSignature: transactionResult.signature
                });
                
                if (paymentResult.success) {
                  Alert.alert(
                    'Payment Successful!',
                    'Your premium subscription is now active. Enjoy your new features!',
                    [{ text: 'OK', onPress: () => loadPremiumData() }]
                  );
                } else {
                  throw new Error(paymentResult.message);
                }
              } catch (paymentError) {
                console.error('Payment error:', paymentError);
                Alert.alert('Payment Failed', paymentError instanceof Error ? paymentError.message : 'Payment could not be processed');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentUser || !currentSubscription) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await SubscriptionService.cancelSubscription(currentUser.id, true);
              Alert.alert('Subscription Cancelled', 'Your subscription will end at the current period end.');
              loadPremiumData();
            } catch (error) {
              console.error('Cancel error:', error);
              Alert.alert('Error', 'Failed to cancel subscription');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRestore = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to restore purchases');
      return;
    }

    try {
      setLoading(true);
      const subscription = await SubscriptionService.validateAndRenewSubscription(currentUser.id);
      
      if (subscription) {
        Alert.alert('Subscription Restored', 'Your premium subscription has been restored!');
        setCurrentSubscription(subscription);
      } else {
        Alert.alert('No Subscription Found', 'No active subscription found to restore.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore subscription');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Features</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={{ color: '#FFF', marginTop: 16 }}>Loading premium features...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Features</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Current Subscription Status */}
        {currentSubscription && (
          <View style={styles.subscriptionStatus}>
            <View style={styles.subscriptionHeader}>
              <Icon name="star" size={24} color="#A5EA15" />
              <Text style={styles.subscriptionTitle}>Premium Active</Text>
            </View>
            <Text style={styles.subscriptionText}>
              {currentSubscription.plan_name || 'Premium Plan'} - 
              Expires: {new Date(currentSubscription.current_period_end).toLocaleDateString()}
            </Text>
            {currentSubscription.cancel_at_period_end && (
              <Text style={styles.cancellationNotice}>
                Subscription will end at current period end
              </Text>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSubscription}>
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Icon name="star" size={48} color="#A5EA15" />
          <Text style={styles.heroTitle}>
            {currentSubscription ? 'Premium Features' : 'Upgrade to WeSplit Premium'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {currentSubscription 
              ? 'Enjoy all premium features with your active subscription'
              : 'Unlock advanced features and take your expense splitting to the next level'
            }
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {premiumFeatures.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Icon name={feature.icon} size={24} color="#A5EA15" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.name}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <View style={styles.featureStatus}>
                {currentSubscription ? (
                  <Icon name="check-circle" size={20} color="#A5EA15" />
                ) : (
                  <Text style={styles.comingSoon}>Premium</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Section */}
        {!currentSubscription && (
          <>
        <View style={styles.pricingSection}>
              <Text style={styles.sectionTitle}>Choose Your Plan</Text>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.pricingCard,
                    selectedPlan === plan.id && styles.selectedPricingCard,
                    plan.isPopular && styles.popularPricingCard
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}
                  <Text style={styles.priceTitle}>{plan.name}</Text>
                  <Text style={styles.price}>${plan.price}/{plan.interval}</Text>
                  <Text style={styles.priceDescription}>{plan.description}</Text>
                  {plan.interval === 'yearly' && (
                    <Text style={styles.savings}>Save 17% compared to monthly</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    selectedPaymentMethod === method.id && styles.selectedPaymentMethod
                  ]}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                >
                  <Icon name={method.icon} size={24} color="#A5EA15" />
                  <Text style={styles.paymentMethodText}>{method.name}</Text>
                  {selectedPaymentMethod === method.id && (
                    <Icon name="check-circle" size={20} color="#A5EA15" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Subscribe Button */}
            <View style={styles.subscribeSection}>
              {selectedPlan && (
                <TouchableOpacity
                  style={[styles.upgradeButton, subscribing && styles.disabledButton]}
                  onPress={() => {
                    const plan = plans.find(p => p.id === selectedPlan);
                    if (plan) handleSubscribe(plan);
                  }}
                  disabled={subscribing || !isConnected}
                >
                  {subscribing ? (
                    <ActivityIndicator size="small" color="#212121" />
                  ) : (
                    <Icon name="star" size={20} color="#212121" />
                  )}
                  <Text style={styles.upgradeButtonText}>
                    {subscribing ? 'Processing...' : `Subscribe Now`}
            </Text>
            </TouchableOpacity>
              )}
              
              {!isConnected && (
                <Text style={styles.warningText}>
                  Connect your wallet to enable payments
                </Text>
              )}
          </View>
          </>
        )}

        {/* Restore Button */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PremiumScreen; 