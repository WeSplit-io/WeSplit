import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Container, Header, Button } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { colors, spacing, typography } from '../../theme';
import { styles } from './styles';
import * as Notifications from 'expo-notifications';

/** System permission options for displaying and using notifications (alerts, sound, badge) */
const NOTIFICATION_PERMISSION_OPTIONS: Notifications.NotificationPermissionsRequest = {
  ios: {
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
  },
};

const SetupNotificationsScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const handleTurnOnNotifications = async () => {
    try {
      // Check current permission status first (no user-facing prompt)
      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;

      if (status !== 'granted') {
        // On Android 13+, create a default channel before requesting so the permission prompt can appear
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync?.('default', {
              name: 'WeSplit',
              importance: Notifications.AndroidImportance.DEFAULT,
              sound: true,
              enableVibration: true,
            });
          } catch {
            // setNotificationChannelAsync may be unavailable (e.g. web)
          }
        }
        // Request system permission with explicit display/use options
        const { status: requestedStatus } = await Notifications.requestPermissionsAsync(NOTIFICATION_PERMISSION_OPTIONS);
        status = requestedStatus;
      }

      (navigation as any).replace('Dashboard', { fromPinUnlock: true });
    } catch (error) {
      console.error('Notification permission error:', error);
      (navigation as any).replace('Dashboard', { fromPinUnlock: true });
    }
  };

  const handleNotRightNow = () => {
    (navigation as any).replace('Dashboard', { fromPinUnlock: true });
  };

  return (
    <Container>
      <View style={styles.container}>
        <Header
          showBackButton={false}
          showHelpCenter={true}
          onHelpCenterPress={handleHelpCenterPress}
        />

        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <PhosphorIcon
                name="BellRinging"
                size={24}
                color={colors.white}
                weight="regular"
              />
            </View>
            <Text style={styles.title}>Get Notified</Text>
            <Text style={styles.subtitle}>
              Know instantly when friends settle up, add expenses, or request money.
            </Text>
          </View>

          {/* Central Image - Phone with Notifications */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FNotifications%20img.png?alt=media&token=88aec4a4-eb2e-4bd8-964d-02f1d273685f',
              }}
              style={styles.centralImage}
              resizeMode="contain"
            />
          </View>

          {/* Bottom Actions */}
          <View style={styles.actionsContainer}>
            <Button
              title="Turn On Notifications"
              onPress={handleTurnOnNotifications}
              variant="primary"
              size="large"
              fullWidth={true}
            />
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleNotRightNow}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Not Right Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Container>
  );
};

export default SetupNotificationsScreen;
