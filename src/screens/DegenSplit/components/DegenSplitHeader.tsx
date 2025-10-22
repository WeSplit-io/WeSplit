/**
 * Degen Split Header Component
 * Consistent header across all Degen Split screens
 */

import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Header } from '../../../components/shared';

interface DegenSplitHeaderProps {
  title?: string;
  onBackPress: () => void;
  showBackButton?: boolean;
  isRealtimeActive?: boolean;
}

const DegenSplitHeader: React.FC<DegenSplitHeaderProps> = ({
  title = 'Degen Split',
  onBackPress,
  showBackButton = true,
  isRealtimeActive = false,
}) => {
  const renderRealtimeIndicator = () => {
    if (!isRealtimeActive) return null;
    
    return (
      <View style={styles.realtimeIndicator}>
        <View style={styles.realtimeDot} />
        <Text style={styles.realtimeText}>Live</Text>
      </View>
    );
  };

  return (
    <Header
      title={title}
      onBackPress={onBackPress}
      showBackButton={showBackButton}
      rightElement={renderRealtimeIndicator()}
    />
  );
};

export default DegenSplitHeader;

const styles = {
  realtimeIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  realtimeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600' as const,
  },
};
