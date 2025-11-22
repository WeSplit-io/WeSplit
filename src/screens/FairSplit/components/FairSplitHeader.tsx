/**
 * Fair Split Header Component
 * Displays bill information and navigation
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { styles } from '../styles';
import Header from '../../../components/shared/Header';

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
  isRealtimeActive?: boolean;
}

const FairSplitHeader: React.FC<FairSplitHeaderProps> = ({
  billName,
  billDate,
  totalAmount,
  category = 'food',
  onBackPress,
  isRealtimeActive = false
}) => {
  return (
    <>
      {/* Navigation Header */}
      <Header 
        title="Fair Split"
        onBackPress={onBackPress}
        showBackButton={true}
        rightElement={
          isRealtimeActive ? (
            <View style={styles.realtimeIndicator}>
              <View style={styles.realtimeDot} />
              <Text style={styles.realtimeText}>Live</Text>
            </View>
          ) : undefined
        }
      />

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
            {(totalAmount || 0).toFixed(2)} USDC
          </Text>
        </View>
  
      </LinearGradient>
    </>
  );
};

export default FairSplitHeader;
