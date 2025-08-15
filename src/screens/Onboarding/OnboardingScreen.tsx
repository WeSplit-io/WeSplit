import React, { useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { useApp } from '../../context/AppContext';

const slides = [
  {
    title: 'Add Friends',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fonboarding1.png?alt=media&token=41dfb55f-d8de-4b3c-b60d-a8adf669ecd9' },
  },
  {
    title: 'Create Groups',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fonboarding2.png?alt=media&token=10e7cb5b-0b84-44ad-906c-f269884ae1f6' },
  },
  {
    title: 'Add expenses',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fonboarding3.png?alt=media&token=e8e56c01-5fd0-4eee-b44f-182b2aaf2b5e' },
  },
  {
    title: 'Pay your friends in a few clicks',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fonboarding4.png?alt=media&token=1d36c769-9efc-48b8-928a-f94b79c8e18d' },
  },
];

const { width } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { updateUser } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const markOnboardingCompleted = async () => {
    try {
      await updateUser({ hasCompletedOnboarding: true });
      console.log('✅ Onboarding marked as completed');
    } catch (error) {
      console.error('❌ Failed to mark onboarding as completed:', error);
    }
  };

  const handleNext = async () => {
    if (page < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
    } else {
      // User completed onboarding
      await markOnboardingCompleted();
      (navigation as any).replace('Dashboard');
    }
  };

  const handleSkip = async () => {
    // User skipped onboarding
    await markOnboardingCompleted();
    (navigation as any).replace('Dashboard');
  };

  const onScroll = (e: any) => {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / width);
    setPage(newPage);
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      {/* Centered content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {slides.map((slide, idx) => (
          <View key={idx} style={[styles.centerContent, { width }]}> 
            <Image source={slide.image} style={styles.illustration} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
      
      {/* Next button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>→</Text>
      </TouchableOpacity>
      
      {/* Pagination - horizontal bars at bottom left */}
      <View style={styles.paginationContainer}>
        {slides.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.paginationBar,
              page === idx && styles.paginationBarActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export default OnboardingScreen; 