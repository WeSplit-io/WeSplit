/**
 * Degen Split Header Component
 * Consistent header across all Degen Split screens
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { styles } from './DegenSplitHeaderStyles';

interface DegenSplitHeaderProps {
  title?: string;
  onBackPress: () => void;
  showBackButton?: boolean;
}

const DegenSplitHeader: React.FC<DegenSplitHeaderProps> = ({
  title = 'Degen Split',
  onBackPress,
  showBackButton = true,
}) => {
  return (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Image
            source={require('../../../../assets/chevron-left.png')}
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      <View style={styles.headerSpacer} />
    </View>
  );
};

export default DegenSplitHeader;
