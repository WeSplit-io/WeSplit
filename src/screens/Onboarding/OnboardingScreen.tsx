import React, { useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';

const slides = [
  {
    title: 'Add Friends',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: require('../../../assets/onboarding1.png'),
  },
  {
    title: 'Create Groups',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: require('../../../assets/onboarding2.png'),
  },
  {
    title: 'Add expenses',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: require('../../../assets/onboarding3.png'),
  },
  {
    title: 'Pay your friends in a few clicks',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    image: require('../../../assets/onboarding4.png'),
  },
];

const { width } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const handleNext = () => {
    if (page < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
    } else {
      (navigation as any).replace('Dashboard');
    }
  };

  const handleSkip = () => {
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