import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '../components/Icon';

const PremiumScreen = ({ navigation }: any) => {
  const features = [
    {
      icon: 'star',
      title: 'Advanced Analytics',
      description: 'Detailed spending insights and expense trends',
      available: false
    },
    {
      icon: 'users',
      title: 'Unlimited Groups',
      description: 'Create and manage unlimited expense groups',
      available: false
    },
    {
      icon: 'shield',
      title: 'Enhanced Security',
      description: 'Additional security features and encryption',
      available: false
    },
    {
      icon: 'download',
      title: 'Export Reports',
      description: 'Export detailed expense reports in PDF format',
      available: false
    },
    {
      icon: 'bell',
      title: 'Priority Support',
      description: '24/7 priority customer support',
      available: false
    },
    {
      icon: 'zap',
      title: 'Faster Transactions',
      description: 'Priority processing for all transactions',
      available: false
    }
  ];

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
        <View style={styles.heroSection}>
          <Icon name="star" size={48} color="#A5EA15" />
          <Text style={styles.heroTitle}>Upgrade to WeSplit Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlock advanced features and take your expense splitting to the next level
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Icon name={feature.icon} size={24} color="#A5EA15" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <View style={styles.featureStatus}>
                <Text style={styles.comingSoon}>Coming Soon</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.pricingCard}>
            <Text style={styles.priceTitle}>Premium Plan</Text>
            <Text style={styles.price}>$4.99/month</Text>
            <Text style={styles.priceDescription}>
              Unlock all premium features and support the development of WeSplit
            </Text>
            <TouchableOpacity style={styles.upgradeButton} disabled>
              <Icon name="star" size={20} color="#212121" />
              <Text style={styles.upgradeButtonText}>Coming Soon</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#A89B9B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  featuresSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#A89B9B',
    lineHeight: 20,
  },
  featureStatus: {
    marginLeft: 16,
  },
  comingSoon: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A5EA15',
    backgroundColor: '#1A2F1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pricingSection: {
    marginTop: 32,
  },
  pricingCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  priceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#A5EA15',
    marginBottom: 8,
  },
  priceDescription: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#A5EA15',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    opacity: 0.6,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 8,
  },
});

export default PremiumScreen; 