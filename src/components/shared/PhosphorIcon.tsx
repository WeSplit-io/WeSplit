/**
 * PhosphorIcon Component
 * Wrapper component for Phosphor Icons to provide consistent styling and easy usage
 * throughout the application
 */

import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { logger } from '../../services/analytics/loggingService';
// eslint-disable-next-line import/namespace
import * as PhosphorIcons from 'phosphor-react-native';

// Type for all available Phosphor icon names
type PhosphorIconName = keyof typeof PhosphorIcons;

// Icon component props interface
interface IconComponentProps {
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  style?: ViewStyle | TextStyle;
}

interface PhosphorIconProps {
  name: PhosphorIconName;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  style?: ViewStyle | TextStyle;
}

const PhosphorIcon: React.FC<PhosphorIconProps> = ({
  name,
  size = 24,
  color = '#000000',
  weight = 'regular',
  style,
}) => {
  const IconComponent = PhosphorIcons[name] as React.ComponentType<IconComponentProps>;

  if (!IconComponent) {
    logger.warn('PhosphorIcon: Icon not found', { iconName: name }, 'PhosphorIcon');
    return null;
  }

  return (
    <IconComponent
      size={size}
      color={color}
      weight={weight}
      style={style}
    />
  );
};

export default PhosphorIcon;
export type { PhosphorIconName, PhosphorIconProps };
