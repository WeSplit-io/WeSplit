import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// Image mapping for group categories
const GROUP_IMAGES: { [key: string]: any } = {
  trip: require('../../assets/trip-icon-black.png'),
  food: require('../../assets/food-icon-black.png'),
  home: require('../../assets/house-icon-black.png'),
  event: require('../../assets/event-icon-black.png'),
  rocket: require('../../assets/rocket-icon-black.png'),
};

interface GroupIconProps {
  category: string;
  color: string;
  size?: number;
  style?: any;
}

const GroupIcon: React.FC<GroupIconProps> = ({ 
  category, 
  color, 
  size = 40,
  style 
}) => {
  // Get the appropriate image source for the group category
  const getGroupImageSource = (categoryName: string) => {
    return GROUP_IMAGES[categoryName] || GROUP_IMAGES['trip']; // Default to trip if not found
  };

  return (
    <View 
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.25, // 25% of size for rounded corners
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style
      ]}
    >
      <Image
        source={getGroupImageSource(category)}
        style={{
          width: size * 0.5, // 50% of container size
          height: size * 0.5,
          resizeMode: 'contain',
        }}
      />
    </View>
  );
};

export default GroupIcon; 