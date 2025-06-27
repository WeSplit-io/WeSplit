import React from 'react';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ViewStyle, StyleProp } from 'react-native';

export type IconType = 'feather' | 'material' | 'ion';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  type?: IconType;
  style?: StyleProp<ViewStyle>;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#333', type = 'feather', style }) => {
  switch (type) {
    case 'material':
      return <MaterialIcons name={name} size={size} color={color} style={style} />;
    case 'ion':
      return <Ionicons name={name} size={size} color={color} style={style} />;
    case 'feather':
    default:
      return <Feather name={name} size={size} color={color} style={style} />;
  }
};

export default Icon; 