/**
 * Christmas Calendar Screen
 * Displays the Christmas Calendar component with header and navigation
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Container, Header } from '../../components/shared';
import ChristmasCalendar from '../../components/rewards/ChristmasCalendar';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { useMemo } from 'react';

const ChristmasCalendarScreen: React.FC = () => {
  const navigation = useNavigation();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;

  if (!currentUser?.id) {
    return null;
  }

  return (
    <Container style={{ backgroundColor: colors.black }} paddingHorizontal={0}>
      <Header
        title="Christmas Calendar"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />
      
      <View style={styles.content}>
        <ChristmasCalendar
          userId={currentUser.id}
          onClaimSuccess={() => {
            // Refresh user data after claiming
            // This will be handled by the component's internal state
          }}
        />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.md,
    paddingHorizontal: 0,
  },
});

export default ChristmasCalendarScreen;

