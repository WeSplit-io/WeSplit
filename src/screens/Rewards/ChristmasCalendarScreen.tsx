/**
 * Christmas Calendar Screen
 * Displays the Christmas Calendar component with header and navigation
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import ChristmasCalendar from '../../components/rewards/ChristmasCalendar';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { useMemo } from 'react';

const ChristmasCalendarScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;

  if (!currentUser?.id) {
    return null;
  }

  return (
    <Container style={{ backgroundColor: colors.black }} paddingHorizontal={0}>
      <Header
        title="Advent Calendar"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
        customStyle={{ paddingHorizontal: spacing.md }}
        rightElement={
          <TouchableOpacity
            onPress={() => rewardNav.goToChristmasCalendarHistory()}
            activeOpacity={0.7}
          >
            <PhosphorIcon name="ListBullets" size={24} color={colors.white} weight="regular" />
          </TouchableOpacity>
        }
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
    paddingHorizontal: 0,
  },
});

export default ChristmasCalendarScreen;

