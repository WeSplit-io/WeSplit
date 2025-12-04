/**
 * Logo Picker Component
 * Modern grid-based icon picker for shared wallet customization
 * Uses thin, minimalist Phosphor icons with improved UX/UI
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerSuccessResult } from 'expo-image-picker';
import { Button, PhosphorIcon, PhosphorIconName } from '../shared';
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
      { name: 'Record', label: 'Record' },
    ],
  },
];

const LogoPicker: React.FC<LogoPickerProps> = ({
  selectedLogo,
  onSelectLogo,
}) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    selectedLogo && selectedLogo.startsWith('http') ? selectedLogo : null
  );

  const iconOptions = useMemo(
    () => LOGO_CATEGORIES.flatMap((category) => category.icons),
    []
  );

  useEffect(() => {
    if (!selectedLogo || selectedLogo.startsWith('http')) {
      setUploadedImage(selectedLogo ?? null);
    } else {
      setUploadedImage(null);
    }
  }, [selectedLogo]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload an icon.');
      return;
    }

    const pickerMediaTypes =
      (ImagePicker as any).MediaType?.Image
        ? [(ImagePicker as any).MediaType.Image]
        : ImagePicker.MediaTypeOptions.Images;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: pickerMediaTypes as any,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled) {
      return;
    }

    const successResult = result as ImagePickerSuccessResult;
    if (!successResult.assets.length) {
      return;
    }

    const [asset] = successResult.assets;
    if (!asset?.uri) {
      return;
    }

    const uri = asset.uri;
    setUploadedImage(uri);
    onSelectLogo(uri);
  }, [onSelectLogo]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      </View>

      <Button
        title={uploadedImage ? 'Change uploaded icon' : 'Upload custom image'}
        onPress={handlePickImage}
        variant="secondary"
        icon="ImageSquare"
        fullWidth={false}
        style={styles.uploadButton}
      />

      {uploadedImage && (
        <View style={styles.uploadPreview}>
          <Image source={{ uri: uploadedImage }} style={styles.uploadPreviewImage} resizeMode="contain" />
          <TouchableOpacity
            style={styles.uploadPreviewRemove}
            onPress={() => {
              setUploadedImage(null);
              onSelectLogo('');
            }}
          >
            <PhosphorIcon name="Trash" size={14} color={colors.red} weight="bold" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {iconOptions.length === 0 ? (
          <View style={styles.emptyState}>
            <PhosphorIcon
              name="MagnifyingGlass"
              size={32}
              color={colors.white50}
              weight="thin"
            />
            <Text style={styles.emptyStateText}>No icons found</Text>
            <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
          </View>
        ) : (
          <View style={styles.iconCloud}>
            {iconOptions.map((iconOption) => {
              const isSelected = selectedLogo === iconOption.name;
              return (
                <TouchableOpacity
                  key={iconOption.name}
                  style={[
                    styles.iconChip,
                    isSelected && styles.iconChipSelected,
                  ]}
                  onPress={() => {
                    setUploadedImage(null);
                    onSelectLogo(iconOption.name);
                  }}
                  activeOpacity={0.6}
                >
                  <PhosphorIcon
                    name={iconOption.name}
                    size={32}
                    color={isSelected ? colors.green : colors.white}
                    weight='regular'
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  uploadButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  uploadPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  uploadPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: spacing.sm,
  },
  uploadPreviewRemove: {
    padding: spacing.xs,
    backgroundColor: colors.white10,
    borderRadius: spacing.sm,
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
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  iconChip: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    backgroundColor: colors.white5,
    gap: spacing.xs,
  },
  iconChipSelected: {
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.green,
  },
  iconLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
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

