import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface TabSecondaryItem {
  label: string;
  value: string;
}

interface TabSecondaryProps {
  tabs: TabSecondaryItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabSecondary: React.FC<TabSecondaryProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={styles.tab}
            onPress={() => onTabChange(tab.value)}
          >
            <Text
              style={[
                styles.text,
                activeTab === tab.value && styles.textActive,
              ]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.value && (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.indicator}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.underline} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  container: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-start',
    gap: spacing.lg,
  },
  tab: {
    position: 'relative',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  textActive: {
    color: colors.white,
  },
  indicator: {
    position: 'absolute',
    bottom: -spacing.xs - 1,
    left: 0,
    right: 0,
    height: 2,
  },
  underline: {
    width: '100%',
    height: 1,
    backgroundColor: colors.white10,
    marginTop: spacing.xs,
  },
});

export default TabSecondary;

