import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Container, Header } from '../../components/shared';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';

const HowItWorksScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);

  const handleBack = () => {
    rewardNav.goBack();
  };

  const handleSeasonOverviewPress = () => {
    rewardNav.goToHowToEarnPoints();
  };

  return (
    <Container>
      <Header
        title="How it works"
        showBackButton
        onBackPress={handleBack}
        backgroundColor={colors.black}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Welcome to <Text style={styles.highlight}>WeSplit Rewards.</Text>
          </Text>
          <Text style={styles.paragraph}>
            Here, every split, every invite, every shared moment earns you points, and being early pays off.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            We're running <Text style={styles.highlight}>6 seasons</Text> before points conversion.
          </Text>
          <Text style={styles.paragraph}>
            Each one comes with its own vibe, rules, and surprises. The earlier you start, the more you stack. Jump in from Season 1 to seriously level up before conversion and public launch.
          </Text>
          <Text style={styles.paragraph}>
            Check out the current{' '}
            <Text style={styles.link} onPress={handleSeasonOverviewPress}>
              Season overview
            </Text>{' '}
            and start stacking your Split Points.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's the utility of a Split Point?</Text>
          <Text style={styles.paragraph}>
            For now, Split Points are your way of leveling up on WeSplit—you earn them every time you split a bill, invite someone, or complete key actions in the app.
          </Text>
          <Text style={styles.paragraph}>
            As we grow, points will unlock more: access to perks, premium features, fee reductions, a point shop, and other community-driven advantages.
          </Text>
          <Text style={styles.paragraph}>
            We're also exploring ways for points to play a role in future ecosystem rewards, including a potential token model. If we go down that path, the community will be the first to know.
          </Text>
        </View>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  paragraph: {
    fontSize: typography.fontSize.md,
    lineHeight: 24,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  highlight: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  link: {
    color: colors.white,
    textDecorationLine: 'underline',
    fontWeight: typography.fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.md,
  },
});

export default HowItWorksScreen;
