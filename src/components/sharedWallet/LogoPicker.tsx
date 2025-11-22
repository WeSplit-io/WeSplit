/**
 * Logo Picker Component
 * Modern grid-based icon picker for shared wallet customization
 * Uses thin, minimalist Phosphor icons with improved UX/UI
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { PhosphorIcon, PhosphorIconName } from '../shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface LogoPickerProps {
  selectedLogo?: string;
  onSelectLogo: (logo: string) => void;
}

interface LogoOption {
  name: PhosphorIconName;
  label: string;
}

// Organized logo bank by categories using thin Phosphor icons
// Curated selection for better UX
const LOGO_CATEGORIES: Array<{
  name: string;
  icons: LogoOption[];
}> = [
  {
    name: 'Money & Finance',
    icons: [
      { name: 'Wallet', label: 'Wallet' },
      { name: 'CreditCard', label: 'Card' },
      { name: 'Bank', label: 'Bank' },
      { name: 'PiggyBank', label: 'Savings' },
      { name: 'Coins', label: 'Coins' },
    ],
  },
  {
    name: 'Groups',
    icons: [
      { name: 'Users', label: 'Users' },
      { name: 'UsersThree', label: 'Group' },
      { name: 'Handshake', label: 'Handshake' },
      { name: 'UserCircle', label: 'Person' },
      { name: 'UsersFour', label: 'Community' },
    ],
  },
  {
    name: 'Activities',
    icons: [
      { name: 'Coffee', label: 'Coffee' },
      { name: 'Car', label: 'Travel' },
      { name: 'House', label: 'Home' },
      { name: 'Gift', label: 'Gift' },
      { name: 'Airplane', label: 'Flight' },
    ],
  },
  {
    name: 'Business',
    icons: [
      { name: 'Briefcase', label: 'Business' },
      { name: 'Buildings', label: 'Office' },
      { name: 'ChartLine', label: 'Growth' },
      { name: 'FileText', label: 'Document' },
      { name: 'TrendUp', label: 'Trend' },
    ],
  },
  {
    name: 'Symbols',
    icons: [
      { name: 'Star', label: 'Star' },
      { name: 'Sparkle', label: 'Sparkle' },
      { name: 'Lightning', label: 'Energy' },
      { name: 'Target', label: 'Target' },
      { name: 'Circle', label: 'Circle' },
    ],
  },
];

const LogoPicker: React.FC<LogoPickerProps> = ({
  selectedLogo,
  onSelectLogo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([LOGO_CATEGORIES[0].name]) // Expand first category by default
  );

  // Filter icons based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return LOGO_CATEGORIES;
    }

    const query = searchQuery.toLowerCase();
    return LOGO_CATEGORIES.map(category => ({
      ...category,
      icons: category.icons.filter(icon => 
        icon.label.toLowerCase().includes(query) ||
        icon.name.toLowerCase().includes(query)
      ),
    })).filter(category => category.icons.length > 0);
  }, [searchQuery]);

  // Auto-expand categories when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const matchingCategories = new Set(
        filteredCategories.map(cat => cat.name)
      );
      setExpandedCategories(matchingCategories);
    }
  }, [searchQuery, filteredCategories]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(filteredCategories.map(cat => cat.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Select Logo</Text>
        {selectedLogo && (
          <View style={styles.selectedBadge}>
            <PhosphorIcon
              name={selectedLogo as PhosphorIconName}
              size={14}
              color={colors.green}
              weight="bold"
            />
            <Text style={styles.selectedBadgeText}>Selected</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <PhosphorIcon
          name="Circle"
          size={16}
          color={colors.white50}
          weight="regular"
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search icons..."
          placeholderTextColor={colors.white50}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <PhosphorIcon
              name="X"
              size={14}
              color={colors.white50}
              weight="bold"
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Expand/Collapse Controls */}
      {filteredCategories.length > 0 && !searchQuery && (
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={expandAll}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <Text style={styles.controlButtonText}>Expand All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={collapseAll}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <Text style={styles.controlButtonText}>Collapse All</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <PhosphorIcon
              name="Circle"
              size={32}
              color={colors.white50}
              weight="thin"
            />
            <Text style={styles.emptyStateText}>No icons found</Text>
            <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
          </View>
        ) : (
          filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.name);
            return (
              <View key={category.name} style={styles.categorySection}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <PhosphorIcon
                      name={isExpanded ? "ChevronDown" : "ChevronRight"}
                      size={14}
                      color={colors.white70}
                      weight="bold"
                    />
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                  <Text style={styles.categoryCount}>{category.icons.length}</Text>
                </TouchableOpacity>
                
                {isExpanded && (
                  <View style={styles.iconGrid}>
                    {category.icons.map((iconOption, index) => {
                      const isSelected = selectedLogo === iconOption.name;
                      return (
                        <TouchableOpacity
                          key={`${category.name}-${index}`}
                          style={[
                            styles.iconOption,
                            isSelected && styles.iconOptionSelected,
                          ]}
                          onPress={() => onSelectLogo(iconOption.name)}
                          activeOpacity={0.6}
                        >
                          <PhosphorIcon
                            name={iconOption.name}
                            size={24}
                            color={isSelected ? colors.green : colors.white70}
                            weight={isSelected ? 'bold' : 'thin'}
                          />
                          {isSelected && (
                            <View style={styles.selectedIndicator}>
                              <PhosphorIcon
                                name="Check"
                                size={12}
                                color={colors.green}
                                weight="bold"
                              />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  selectedBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    paddingVertical: spacing.xs / 2,
  },
  clearButton: {
    padding: spacing.xs / 2,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    justifyContent: 'flex-end',
  },
  controlButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.white5,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  controlButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  categorySection: {
    marginBottom: spacing.sm,
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  categoryName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryCount: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    fontWeight: typography.fontWeight.medium,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconOption: {
    width: 64,
    height: 64,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white10,
    position: 'relative',
  },
  iconOptionSelected: {
    backgroundColor: colors.greenBlue20,
    borderColor: colors.green,
    borderWidth: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
  },
});

export default LogoPicker;

