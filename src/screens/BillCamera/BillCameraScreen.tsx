/**
 * Bill Camera Screen
 * Camera interface for capturing bill images for OCR processing
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './BillCameraStyles';
import { logger } from '../../services/loggingService';

const { width, height } = Dimensions.get('window');

interface BillCameraScreenProps {
  navigation: any;
}

const BillCameraScreen: React.FC<BillCameraScreenProps> = ({ navigation }) => {
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
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
      console.error('BillCameraScreen: Error requesting camera permission:', error);
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
      console.error('Error taking picture:', error);
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
      console.error('Error picking image:', error);
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
        console.error('Error navigating to BillProcessing:', error);
        Alert.alert('Navigation Error', 'Failed to open bill processing screen');
      }
    }
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === 'back' ? 'front' : 'back'
    );
  };

  logger.debug('Rendering with permission', { permission }, 'BillCameraScreen');

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera access is required to capture bills</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: colors.surface, marginTop: spacing.md }]} 
            onPress={() => {
              try {
                navigation.navigate('SplitsList');
              } catch (error) {
                console.error('Error navigating to SplitsList:', error);
                navigation.goBack();
              }
            }}
          >
            <Text style={[styles.permissionButtonText, { color: colors.text }]}>Go to Splits</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (capturedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        
        {/* Header with Back Button and Title */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={retakePicture}
          >
            <Image 
              source={require('../../../assets/chevron-left.png')} 
              style={styles.backButtonIcon}
            />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Check Image</Text>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Full Height Image */}
        <View style={styles.fullHeightImageContainer}>
          <Image source={{ uri: capturedImage }} style={styles.fullHeightImage} />
        </View>

        {/* Bottom Actions */}
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <LinearGradient
            colors={[colors.green, colors.greenBlue]}
            style={styles.processButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity 
              style={styles.processButtonTouchable}
              onPress={processBill}
            >
              <Text style={styles.processButtonText}>Continue</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header with Back Button and Title */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../../../assets/chevron-left.png')} 
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Scan your receipt</Text>
        
        <View style={styles.headerSpacer} />
      </View>

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
        {/* Manual Button - Bottom Left */}
        <TouchableOpacity 
          style={styles.bottomLeftButton} 
          onPress={() => {
            try {
              navigation.navigate('ManualBillCreation');
            } catch (error) {
              console.error('Error navigating to ManualBillCreation:', error);
              navigation.goBack();
            }
          }}
        >
        <Image source={{uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkeyboard-icon.png?alt=media&token=b8e9177e-c02a-4e57-97c4-15748efaa7e9'}} style={styles.bottomLeftButtonIcon} />
          <Text style={styles.bottomLeftButtonText}>Manual</Text>
        </TouchableOpacity>

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

        {/* Gallery Button - Bottom Right */}
        <TouchableOpacity 
          style={styles.bottomRightButton} 
          onPress={pickImageFromGallery}
        >
          <Image source={{uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmedia-icon.png?alt=media&token=27a24ab9-8512-4cd7-9520-fdaf6f9883a9'}} style={styles.bottomRightButtonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


export default BillCameraScreen;
