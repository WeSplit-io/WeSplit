import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  enableAnimation?: boolean;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  enableAnimation = false,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation function for tab changes
  const animateTabChange = (callback: () => void) => {
    if (!enableAnimation || isAnimating) {
      callback();
      return;
    }

    setIsAnimating(true);

    // Fade out and slide out current content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Execute the callback (tab change)
      callback();

      // Reset slide position
      slideAnim.setValue(20);

      // Fade in and slide in new content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    });
  };

  const handleTabPress = (tab: Tab) => {
    if (tab.value === activeTab) {return;}
    animateTabChange(() => onTabChange(tab.value));
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          style={styles.tab}
          onPress={() => handleTabPress(tab)}
          disabled={isAnimating}
        >
          {activeTab === tab.value ? (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Text style={styles.tabTextActive}>{tab.label}</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>{tab.label}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: colors.white5,
    borderRadius: 16,
    marginBottom: spacing.md,
    width: '100%',
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabGradient: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70, // 70% white opacity - readable on dark background
  },
  tabTextActive: {
    color: colors.textDark, // Dark text for better contrast on bright gradient
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
});

export default Tabs;

