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

const MultiSignExplanationScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleActivate = () => {
    // In a real app, this would activate multi-sign
    navigation.navigate('MultiSignActivated');
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.placeholder} />
          <Text style={styles.modalTitle}>What is multi-sign?</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.modalContent}>
          <Text style={styles.explanationText}>
            Multisign lets you approve once to authorize multiple payments at the same time, 
            saving you time by avoiding manual approval for each transaction.
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.activateButton}
            onPress={handleActivate}
          >
            <Text style={styles.activateButtonText}>Activate multisign</Text>
            <Icon name="chevron-right" size={20} color={colors.black} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default MultiSignExplanationScreen; 