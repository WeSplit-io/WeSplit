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
import PhosphorIcon from '../../../components/shared/PhosphorIcon';

// Local image mapping for category icons - using Phosphor icons
const CATEGORY_IMAGES_LOCAL: { [key: string]: any } = {
  trip: 'Suitcase',
  food: 'Coffee',
  home: 'House',
  event: 'Calendar',
  rocket: 'Rocket',
};

interface FairSplitHeaderProps {
  billName: string;
  billDate: string;
  totalAmount: number;
  category?: string;
  onBackPress: () => void;
  isRealtimeActive?: boolean;
  onSharePress?: () => void; // Optional share button callback
}

const FairSplitHeader: React.FC<FairSplitHeaderProps> = ({
  billName,
  billDate,
  totalAmount,
  category = 'food',
  onBackPress,
  isRealtimeActive = false,
  onSharePress
}) => {
  return (
    <>
      {/* Navigation Header */}
      <Header 
        title="Fair Split"
        onBackPress={onBackPress}
        showBackButton={true}
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {onSharePress && (
              <TouchableOpacity 
                onPress={onSharePress}
                style={{
                  backgroundColor: colors.white10,
                  borderRadius: 8,
                  padding: spacing.xs + 2,
                  borderWidth: 1,
                  borderColor: colors.green + '40',
                }}
                activeOpacity={0.7}
              >
                <PhosphorIcon name="ShareNetwork" size={20} color={colors.green} />
              </TouchableOpacity>
            )}
            {isRealtimeActive && (
            <View style={styles.realtimeIndicator}>
              <View style={styles.realtimeDot} />
              <Text style={styles.realtimeText}>Live</Text>
            </View>
            )}
          </View>
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
          {typeof CATEGORY_IMAGES_LOCAL[category] === 'string' ? (
            <PhosphorIcon
              name={CATEGORY_IMAGES_LOCAL[category] as any}
              size={32}
              color={colors.white}
              style={styles.billIconImage}
            />
          ) : (
            <Image
              source={CATEGORY_IMAGES_LOCAL[category]}
              style={styles.billIconImage}
              resizeMode="contain"
            />
          )}
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
