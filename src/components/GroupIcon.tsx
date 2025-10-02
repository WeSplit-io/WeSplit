import React from 'react';
import { View, Image } from 'react-native';
import { colors } from '../theme';

// Image mapping for group categories
const GROUP_IMAGES: { [key: string]: any } = {
  trip: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftrip-icon-black.png?alt=media&token=3afeb768-566f-4fd7-a550-a19c5c4f5caf' },
  food: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffood-icon-black.png?alt=media&token=ef382697-bf78-49e6-b3b3-f669378ebd36' },
  home: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhouse-icon-black.png?alt=media&token=03406723-1c5b-45fd-a20b-dda8c49a2f83' },
  event: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fevent-icon-black.png?alt=media&token=b11d12c2-c4d9-4029-be12-0ddde31ad0d1' },
  rocket: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Frocket-icon-black.png?alt=media&token=90fabb5a-8110-4fd9-9753-9c785fa953a4' },
};

interface GroupIconProps {
  category: string;
  size?: number;
  style?: any;
}

const GroupIcon: React.FC<GroupIconProps> = ({ 
  category, 
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
          borderRadius: 8, // Fixed border radius for design consistency
          backgroundColor: '#404040', // Dark gray background as shown in design
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
          tintColor: colors.white, // Apply white tint to make icons white
        }}
      />
    </View>
  );
};

export default GroupIcon; 