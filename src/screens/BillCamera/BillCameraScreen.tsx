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
  SafeAreaView,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './BillCameraStyles';

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
    console.log('BillCameraScreen: Component mounted');
    console.log('BillCameraScreen: Permission status:', permission);
    console.log('BillCameraScreen: CameraView object:', CameraView);
  }, [permission]);

  const handleRequestPermission = async () => {
    try {
      console.log('BillCameraScreen: Requesting camera permission...');
      const result = await requestPermission();
      console.log('BillCameraScreen: Permission request result:', result);
      
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
    if (!cameraRef.current || isCapturing) return;

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

  console.log('BillCameraScreen: Rendering with permission:', permission);

  if (!permission) {
    console.log('BillCameraScreen: Rendering permission request screen');
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
        
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          <View style={styles.previewOverlay}>
            <Text style={styles.previewTitle}>Bill Captured</Text>
            <Text style={styles.previewSubtitle}>
              Review your bill image and proceed to process it
            </Text>
          </View>
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.processButton} onPress={processBill}>
            <Text style={styles.processButtonText}>Process Bill</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            try {
              navigation.navigate('SplitsList');
            } catch (error) {
              console.error('Error navigating to SplitsList:', error);
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backButtonText}>← Splits</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Capture Bill</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={pickImageFromGallery}>
            <Text style={styles.headerActionText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => {
            try {
              navigation.navigate('SplitsList');
            } catch (error) {
              console.error('Error navigating to SplitsList:', error);
            }
          }}>
            <Text style={styles.headerActionText}>Splits</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        {permission?.granted && CameraView ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraType}
            flash={flashMode}
          >
          <View style={styles.cameraOverlay}>
            {/* Camera overlay guides */}
            <View style={styles.overlayFrame}>
              <View style={styles.corner} style={[styles.corner, styles.topLeft]} />
              <View style={styles.corner} style={[styles.corner, styles.topRight]} />
              <View style={styles.corner} style={[styles.corner, styles.bottomLeft]} />
              <View style={styles.corner} style={[styles.corner, styles.bottomRight]} />
            </View>
            
            <Text style={styles.overlayText}>
              Position the bill within the frame
            </Text>
          </View>
          </CameraView>
        ) : (
          <View style={styles.cameraError}>
            <Text style={styles.cameraErrorText}>
              {!CameraView ? 'Camera API not available' : 'Camera not available'}
            </Text>
            <Text style={styles.cameraErrorSubtext}>
              {!CameraView ? 'Please check your expo-camera installation' : 'Please grant camera permission'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Text style={styles.controlButtonText}>
              {flashMode === 'off' ? 'Flash Off' : 'Flash On'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]} 
            onPress={takePicture}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
            <Text style={styles.controlButtonText}>Flip</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.instructions}>
          Tap the camera button to capture your bill, or select from gallery
        </Text>
      </View>
    </SafeAreaView>
  );
};


export default BillCameraScreen;
