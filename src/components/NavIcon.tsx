import React from 'react';
import { Image, ViewStyle, StyleProp, ImageStyle } from 'react-native';
import Icon from './Icon';
import { colors } from '../theme';

interface NavIconProps {
  name: string;
  size?: number;
  isActive?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Icon mapping to asset filenames for navigation
const navIconMap: Record<string, string> = {
  'home': 'home-icon',
  'wallet': 'wallet-icon',
  'folder': 'folder-icon',
  'book': 'book-icon',
  'user': 'profile-icon',
};

const NavIcon: React.FC<NavIconProps> = ({ name, size = 24, isActive = false, style }) => {
  const baseIconName = navIconMap[name];
  
  if (!baseIconName) {
    console.warn(`NavIcon: No mapping found for icon name "${name}"`);
    return null;
  }

  // Determine the correct filename based on active state
  const iconSuffix = isActive ? '-green' : '-default';
  const iconFileName = `${baseIconName}${iconSuffix}.png`;

  // For now, fall back to the original Icon component since the image assets might not be available
  // This ensures the navigation bar still works while the image assets are being prepared
  return (
    <Icon 
      name={name} 
      size={size} 
      color={isActive ? colors.brandGreen : colors.textLight} 
      style={style}
    />
  );

  // TODO: Uncomment this when all image assets are available
  /*
  return (
    <Image
      source={{ uri: `asset:/assets/${iconFileName}` }}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style as ImageStyle,
      ]}
      onError={() => {
        console.warn(`NavIcon: Failed to load image asset: ${iconFileName}`);
      }}
    />
  );
  */
};

export default NavIcon; 