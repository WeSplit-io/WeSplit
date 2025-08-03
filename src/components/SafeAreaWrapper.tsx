import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: any;
  bottom?: boolean;
  top?: boolean;
  left?: boolean;
  right?: boolean;
}

const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  bottom = false,
  top = false,
  left = false,
  right = false,
}) => {
  const insets = useSafeAreaInsets();

  const safeAreaStyle = {
    paddingTop: top ? insets.top : 0,
    paddingBottom: bottom ? insets.bottom : 0,
    paddingLeft: left ? insets.left : 0,
    paddingRight: right ? insets.right : 0,
  };

  return (
    <View style={[safeAreaStyle, style]}>
      {children}
    </View>
  );
};

export default SafeAreaWrapper; 