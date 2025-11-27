/**
 * Degen Split Header Component
 * Consistent header across all Degen Split screens
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Header, PhosphorIcon } from '../../../components/shared';

interface DegenSplitHeaderProps {
  title?: string;
  onBackPress: () => void;
  showBackButton?: boolean;
  isRealtimeActive?: boolean;
  onSharePress?: () => void; // Optional share button callback
}

const DegenSplitHeader: React.FC<DegenSplitHeaderProps> = ({
  title = 'Degen Split',
  onBackPress,
  showBackButton = true,
  isRealtimeActive = false,
  onSharePress,
}) => {
  const renderRightElement = () => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {onSharePress && (
          <TouchableOpacity 
            onPress={onSharePress}
            style={styles.shareButton}
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
    );
  };

  return (
    <Header
      title={title}
      onBackPress={onBackPress}
      showBackButton={showBackButton}
      rightElement={renderRightElement()}
    />
  );
};

export default DegenSplitHeader;

const styles = {
  shareButton: {
    backgroundColor: colors.white10,
    borderRadius: 8,
    padding: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.green + '40',
  } as const,
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
