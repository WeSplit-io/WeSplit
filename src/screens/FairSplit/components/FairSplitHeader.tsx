/**
 * Fair Split Header Component
 * Displays bill information and navigation
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { typography } from '@theme/typography';
import { styles } from '../styles';

// Local image mapping for category icons
const CATEGORY_IMAGES_LOCAL: { [key: string]: any } = {
  trip: require('../../../../assets/trip-icon-black.png'),
  food: require('../../../../assets/food-icon-black.png'),
  home: require('../../../../assets/house-icon-black.png'),
  event: require('../../../../assets/event-icon-black.png'),
  rocket: require('../../../../assets/rocket-icon-black.png'),
};

interface FairSplitHeaderProps {
  billName: string;
  billDate: string;
  totalAmount: number;
  category?: string;
  onBackPress: () => void;
}

const FairSplitHeader: React.FC<FairSplitHeaderProps> = ({
  billName,
  billDate,
  totalAmount,
  category = 'food',
  onBackPress
}) => {
  return (
    <>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBackPress}
        >
          <Image 
            source={require('../../../../assets/chevron-left.png')} 
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Fair Split</Text>
        
        <View style={{ width: 40 }} />
      </View>

      {/* Bill Summary Card */}
      <LinearGradient
        colors={[colors.green, colors.greenBlue]}
        style={styles.billCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.billHeader}>
          <Image
            source={CATEGORY_IMAGES_LOCAL[category]}
            style={styles.billIconImage}
            resizeMode="contain"
          />
          <View style={styles.billTitleContainer}>
            <Text style={styles.billTitle}>
              {billName}
            </Text>
            <Text style={styles.billDate}>
              {billDate}
            </Text>
          </View>
        </View>
        
        <View style={styles.billAmountContainer}>
          <Text style={styles.billAmountLabel}>Total Bill</Text>
          <Text style={styles.billAmountUSDC}>
            {totalAmount.toFixed(1)} USDC
          </Text>
        </View>
        <View style={styles.billCardDotLeft}/>
        <View style={styles.billCardDotRight}/>
      </LinearGradient>
    </>
  );
};

export default FairSplitHeader;
