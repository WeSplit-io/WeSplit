/**
 * Bill Camera Screen
 * Camera interface for capturing bill images for OCR processing
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { styles } from './BillCameraStyles';
import { logger } from '../../../services/analytics/loggingService';
import { Container } from '../../../components/shared';
import Header from '../../../components/shared/Header';
import Button from '../../../components/shared/Button';

interface BillCameraScreenProps {
  navigation: any;
}

const BillCameraScreen: React.FC<BillCameraScreenProps> = ({ navigation }) => {
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  // Camera type and flash mode state - defaults to back camera and flash off
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    logger.debug('Component mounted', null, 'BillCameraScreen');
    logger.debug('Permission status', { permission }, 'BillCameraScreen');
  }, [permission]);

  const handleRequestPermission = async () => {
    try {
      logger.info('Requesting camera permission', null, 'BillCameraScreen');
      const result = await requestPermission();
      logger.info('Permission request result', { result }, 'BillCameraScreen');
      
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'We need camera access to capture bill images for splitting.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {} }
          ]
        );
      }
    } catch (error) {
      logger.error('Error requesting camera permission', { error }, 'BillCameraScreen');
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) {return;}

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
      }
    } catch (error) {
      logger.error('Error taking picture', { error }, 'BillCameraScreen');
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('Error picking image', { error }, 'BillCameraScreen');
      Alert.alert('Error', 'Failed to select image from gallery.');
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  const processBill = () => {
    if (capturedImage) {
      try {
        navigation.navigate('BillProcessing', {
          imageUri: capturedImage,
          isNewBill: true, // Flag to indicate this is a new bill from camera
        });
      } catch (error) {
        logger.error('Error navigating to BillProcessing', { error }, 'BillCameraScreen');
        Alert.alert('Navigation Error', 'Failed to open bill processing screen');
      }
    }
  };

  // Flash and camera type toggle functions are not currently used
  // but may be needed for future camera controls
  // const toggleFlash = () => {
  //   setFlashMode(flashMode === 'off' ? 'on' : 'off');
  // };
  // 
  // const toggleCameraType = () => {
  //   setCameraType(
  //     cameraType === 'back' ? 'front' : 'back'
  //   );
  // };

  logger.debug('Rendering with permission', { permission }, 'BillCameraScreen');

  if (!permission) {
    return (
      <Container>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </Container>
    );
  }

  if (!permission.granted) {
    return (
      <Container>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera access is required to capture bills</Text>
          <Button
            title="Grant Permission"
            onPress={handleRequestPermission}
            variant="primary"
            fullWidth={true}
            style={{ marginTop: spacing.md }}
          />
          <Button
            title="Go to Splits"
            onPress={() => {
              try {
                navigation.navigate('SplitsList');
              } catch (error) {
                logger.error('Error navigating to SplitsList', { error }, 'BillCameraScreen');
                navigation.goBack();
              }
            }}
            variant="secondary"
            fullWidth={true}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Container>
    );
  }

  if (capturedImage) {
    return (
      <Container>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        
        {/* Header with Back Button and Title */}
        <Header 
          title="Check Image"
          onBackPress={retakePicture}
          showBackButton={true}
        />

        {/* Full Height Image */}
        <View style={styles.fullHeightImageContainer}>
          <Image source={{ uri: capturedImage }} style={styles.fullHeightImage} />
        </View>

        {/* Bottom Actions */}
        <View style={styles.previewActions}>
          <View style={{ flex: 1}}>
            <Button
              title="Retake"
              onPress={retakePicture}
              variant="secondary"
              fullWidth={true}
            />
          </View>
          
          <View style={{ flex: 1}}>
            <Button
              title="Continue"
              onPress={processBill}
              variant="primary"
              fullWidth={true}
            />
          </View>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header with Back Button and Title */}
      <Header 
        title="Scan your receipt"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      {/* Camera View - Full Screen */}
      <View style={styles.cameraContainer}>
        {permission?.granted && CameraView ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraType}
            flash={flashMode}
          />
        ) : (
          <View style={styles.cameraError}>
            <Text style={styles.cameraErrorText}>
              {!CameraView ? 'Camera API not available' : 'Camera not available'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        {/* Left spacer */}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Button
            title="Manual"
            onPress={() => {
              try {
                navigation.navigate('ManualBillCreation');
              } catch (error) {
                logger.error('Error navigating to ManualBillCreation', { error }, 'BillCameraScreen');
                navigation.goBack();
              }
            }}
            variant="secondary"
            icon="Keyboard"
            iconPosition="left"
          />
        </View>

        {/* Capture Button - Bottom Center */}
        <LinearGradient
          colors={[colors.green, colors.greenBlue]}
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity 
            style={styles.captureButtonTouchable}
            onPress={takePicture}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Right spacer */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Button
            title=""
            onPress={pickImageFromGallery}
            variant="secondary"
            icon="Images"
            iconPosition="left"
            style={{ width: 60, height: 60, borderRadius: 30 }}
          />
        </View>
      </View>
    </Container>
  );
};


export default BillCameraScreen;
