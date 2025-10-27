/**
 * Degen Split Progress Component
 * Shows lock progress with animated circle
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { styles } from './DegenSplitProgressStyles';
import { getParticipantStatusDisplayText } from '../../../utils/statusUtils';

interface DegenSplitProgressProps {
  lockedCount: number;
  totalCount: number;
  circleProgressRef: React.MutableRefObject<Animated.Value>;
}

const DegenSplitProgress: React.FC<DegenSplitProgressProps> = ({
  lockedCount,
  totalCount,
  circleProgressRef,
}) => {
  // Update circle progress animation when locked count changes
  useEffect(() => {
    if (!circleProgressRef.current) {return;}
    
    const progressPercentage = totalCount > 0 ? lockedCount / totalCount : 0;
    
    Animated.timing(circleProgressRef.current, {
      toValue: progressPercentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [lockedCount, totalCount, circleProgressRef]);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressCircle}>
        {/* Background circle */}
        <View style={styles.progressBackground} />
        
        {/* Progress fill using animated borders */}
        {circleProgressRef.current && (
          <Animated.View 
            style={[
              styles.progressFill,
              {
                borderColor: 'transparent',
                borderTopColor: circleProgressRef.current.interpolate({
                  inputRange: [0, 0.01, 1],
                  outputRange: ['transparent', colors.green, colors.green],
                }),
                borderRightColor: circleProgressRef.current.interpolate({
                  inputRange: [0, 0.25, 1],
                  outputRange: ['transparent', 'transparent', colors.green],
                }),
                borderBottomColor: circleProgressRef.current.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['transparent', 'transparent', colors.green],
                }),
                borderLeftColor: circleProgressRef.current.interpolate({
                  inputRange: [0, 0.75, 1],
                  outputRange: ['transparent', 'transparent', colors.green],
                }),
              }
            ]} 
          />
        )}
        
        <View style={styles.progressInner}>
          <Text style={styles.progressPercentage}>
            {lockedCount}/{totalCount}
          </Text>
          <Text style={styles.progressAmount}>
            {lockedCount === totalCount ? getParticipantStatusDisplayText('locked') : getParticipantStatusDisplayText('pending')}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default DegenSplitProgress;
