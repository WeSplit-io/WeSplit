import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, colors } from '../../theme';

interface ContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  paddingHorizontal?: number;
  paddingVertical?: number;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * Container component with SafeAreaView and consistent padding
 * Provides a standardized container for all screens with:
 * - SafeAreaView for proper safe area handling
 * - Horizontal padding using theme spacing
 * - Customizable background color and padding
 */
const Container: React.FC<ContainerProps> = ({
  children,
  style,
  backgroundColor = colors.black,
  paddingHorizontal = spacing.md,
  paddingVertical = spacing.sm,
  safeAreaEdges = ['top', 'bottom'],
}) => {
  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingHorizontal,
      paddingVertical,
    },
    style,
  ];

  return (
    <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Container;
