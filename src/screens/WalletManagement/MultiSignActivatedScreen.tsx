import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { styles } from './styles';

const MultiSignActivatedScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleGoBack = () => {
    // Go back to the wallet management screen
    navigation.navigate('WalletManagement');
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleGoBack}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.placeholder} />
          <Text style={styles.modalTitle}>Multi-sign activated</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.modalContent}>
          <View style={styles.successIconContainer}>
            <Icon name="check" size={48} color={colors.white} />
          </View>
          <Text style={styles.successText}>Multi-sign activated</Text>
        </View>

        {/* Action Button */}
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.activateButton}
            onPress={handleGoBack}
          >
            <Text style={styles.activateButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default MultiSignActivatedScreen; 