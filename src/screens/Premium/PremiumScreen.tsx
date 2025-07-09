import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '../../components/Icon';
import styles from './styles';

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

export default PremiumScreen; 