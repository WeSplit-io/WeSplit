import React from 'react';
import { View, Text, TouchableOpacity, Image, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import PhosphorIcon from './PhosphorIcon';

type HeaderVariant = 'default' | 'titleOnly' | 'logoOnly' | 'logoWithBack';

interface HeaderProps {
  title?: string;
  onBackPress?: () => void;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  backButtonColor?: string;
  customStyle?: StyleProp<ViewStyle>;
  variant?: HeaderVariant;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onBackPress,
  showBackButton = true,
  rightElement,
  backgroundColor = colors.black,
  titleColor = colors.white,
  backButtonColor = colors.white,
  customStyle,
  variant = 'default',
}) => {
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    }
  };

  const effectiveShowBackButton = variant === 'titleOnly' || variant === 'logoOnly' ? false : showBackButton;

  const renderCenterContent = () => {
    if (variant === 'logoOnly' || variant === 'logoWithBack') {
      return (
        <View style={styles.logoSection}>
          <Image 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FWeSplitLogoName.png?alt=media&token=f785d9b1-f4e8-4f51-abac-e17407e4a48f' }} 
            style={styles.logo} 
          />
        </View>
      );
    }
    
    if (title) {
      return <Text style={[styles.headerTitle, { color: titleColor }]}>{title}</Text>;
    }
    
    return <View style={styles.placeholder} />;
  };

  return (
    <View style={[styles.header, { backgroundColor }, customStyle]}>
      {effectiveShowBackButton ? (
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <PhosphorIcon
            name="CaretLeft"
            size={24}
            color={backButtonColor}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      
      {renderCenterContent()}
      
      {rightElement || <View style={styles.placeholder} />}
    </View>
  );
};

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center' as const,
    flex: 1,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  logoSection: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flex: 1,
  },
  logo: {
    height: 40,
    width: 120,
    resizeMode: 'contain' as const,
  },
};

export default Header;
