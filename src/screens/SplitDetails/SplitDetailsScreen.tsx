/**
 * Split Details Screen
 * Screen for editing bill split details, managing participants, and configuring split methods
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SplitDetailsScreenProps {
  navigation: any;
}

const SplitDetailsScreen: React.FC<SplitDetailsScreenProps> = ({ navigation }) => {
  const [billName, setBillName] = useState('Restaurant Night');
  const [totalAmount, setTotalAmount] = useState('65.6');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedSplitType, setSelectedSplitType] = useState<'fair' | 'degen' | null>(null);
  const [participants, setParticipants] = useState([
    { id: '1', name: 'PauluneMoon', walletAddress: 'B3gt.....sdgux', status: 'accepted' },
    { id: '2', name: 'Haxxxoloto', walletAddress: 'C4ht.....kdfux', status: 'accepted' },
    { id: '3', name: 'Rémi', walletAddress: 'D5iu.....jghux', status: 'pending' },
    { id: '4', name: 'Florian', walletAddress: 'E6jk.....lhiux', status: 'pending' },
  ]);

  const handleAddParticipant = () => {
    Alert.alert('Add Participant', 'This will open the contacts screen to add more participants');
  };

  const handleSplitBill = () => {
    console.log('Opening split modal...');
    setShowSplitModal(true);
  };

  const handleSplitTypeSelection = (type: 'fair' | 'degen') => {
    console.log('Split type selected:', type);
    setSelectedSplitType(type);
    console.log('Current selectedSplitType state:', type);
  };

  const handleContinue = () => {
    console.log('Continue button pressed, selectedSplitType:', selectedSplitType);
    console.log('Modal should close and navigate to FairSplit');
    
    if (!selectedSplitType) {
      Alert.alert('Please select a split type', 'Choose either Fair Split or Degen Split to continue');
      return;
    }

    setShowSplitModal(false);
    
    if (selectedSplitType === 'fair') {
      // Navigate to Fair Split screen
      const billData = {
        title: billName,
        totalAmount: parseFloat(totalAmount),
        date: '10 Mar. 2025',
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          status: p.status,
        })),
      };
      
      console.log('Navigating to FairSplit with data:', billData);
      navigation.navigate('FairSplit', { billData });
    } else {
      // Navigate to Degen Lock screen
      const billData = {
        name: billName,
        totalAmount: parseFloat(totalAmount),
        date: '10 Mar. 2025',
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          status: p.status,
        })),
      };
      
      console.log('Navigating to DegenLock with data:', billData);
      navigation.navigate('DegenLock', {
        billData,
        participants: [
          { id: '1', name: 'PauluneMoon', userId: 'B3Lz4GJGrl87x892', avatar: '👤' },
          { id: '2', name: 'Alice', userId: 'A1B2C3D4E5F6G7H8', avatar: '👤' },
          { id: '3', name: 'Bob', userId: 'B2C3D4E5F6G7H8I9', avatar: '👤' },
          { id: '4', name: 'Charlie', userId: 'C3D4E5F6G7H8I9J0', avatar: '👤' },
        ],
        totalAmount: parseFloat(totalAmount),
      });
    }
  };

  const handleCloseModal = () => {
    setShowSplitModal(false);
    setSelectedSplitType(null);
  };

  // Debug effect to track selectedSplitType changes
  useEffect(() => {
    console.log('selectedSplitType state changed to:', selectedSplitType);
  }, [selectedSplitType]);

  // Debug effect to track modal visibility
  useEffect(() => {
    console.log('Modal visibility changed to:', showSplitModal);
  }, [showSplitModal]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Split the Bill</Text>
        
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Details Card */}
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billIcon}>🍽️</Text>
              <Text style={styles.billTitle}>{billName}</Text>
            </View>
            <Text style={styles.billDate}>10 Mar. 2025</Text>
          </View>
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <View style={styles.billAmountRow}>
              <Text style={styles.billAmountUSDC}>65,6 USDC</Text>
              <Text style={styles.billAmountEUR}>61,95€</Text>
            </View>
          </View>
          
          <View style={styles.splitInfoContainer}>
            <View style={styles.splitInfoLeft}>
              <Text style={styles.splitInfoLabel}>Split between:</Text>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar} />
                <View style={styles.avatar} />
                <View style={styles.avatar} />
                <View style={styles.avatar} />
                <View style={styles.avatarOverlay}>
                  <Text style={styles.avatarOverlayText}>+4</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddParticipant}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <Text style={styles.participantsTitle}>In the pool:</Text>
          
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantCard}>
              <View style={styles.participantAvatar} />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantWallet}>{participant.walletAddress}</Text>
              </View>
              <View style={styles.participantStatus}>
                {participant.status === 'accepted' ? (
                  <Text style={styles.statusAccepted}>✓</Text>
                ) : (
                  <Text style={styles.statusPending}>Pending</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.splitButton} onPress={handleSplitBill}>
          <Text style={styles.splitButtonText}>Split</Text>
        </TouchableOpacity>
      </View>

      {/* Split Type Selection Modal */}
      <Modal
        visible={showSplitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandle} />
            
            {/* Modal Content */}
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose your splitting style</Text>
              <Text style={styles.modalSubtitle}>
                Pick how you want to settle the bill with friends.
              </Text>
              
              {/* Split Type Options */}
              <View style={styles.splitOptionsContainer}>
                {/* Fair Split Option */}
                <TouchableOpacity
                  style={[
                    styles.splitOption,
                    selectedSplitType === 'fair' && styles.splitOptionSelected
                  ]}
                  onPress={() => handleSplitTypeSelection('fair')}
                >
                  <View style={styles.splitOptionIcon}>
                    <Text style={styles.splitOptionIconText}>⚖️</Text>
                  </View>
                  <Text style={styles.splitOptionTitle}>Fair Split</Text>
                  <Text style={styles.splitOptionDescription}>
                    Everyone pays their fair share
                  </Text>
                </TouchableOpacity>
                
                {/* Degen Split Option */}
                <TouchableOpacity
                  style={[
                    styles.splitOption,
                    selectedSplitType === 'degen' && styles.splitOptionSelected
                  ]}
                  onPress={() => handleSplitTypeSelection('degen')}
                >
                  <View style={styles.riskyModeLabel}>
                    <Text style={styles.riskyModeIcon}>🔥</Text>
                    <Text style={styles.riskyModeText}>Risky mode</Text>
                  </View>
                  <View style={styles.splitOptionIcon}>
                    <Text style={styles.splitOptionIconText}>🎲</Text>
                  </View>
                  <Text style={styles.splitOptionTitle}>Degen Split</Text>
                  <Text style={styles.splitOptionDescription}>
                    One pays it all, luck decides who
                  </Text>
                </TouchableOpacity>
              </View>
              
               {/* Continue Button */}
               <TouchableOpacity
                 style={[
                   styles.continueButton,
                   !selectedSplitType && styles.continueButtonDisabled
                 ]}
                 onPress={() => {
                   console.log('Continue button touched!');
                   handleContinue();
                 }}
                 disabled={!selectedSplitType}
               >
                 <LinearGradient
                   colors={selectedSplitType ? [colors.green, colors.greenLight] : [colors.surface, colors.surface]}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 0 }}
                   style={styles.continueButtonGradient}
                 >
                   <Text style={[
                     styles.continueButtonText,
                     !selectedSplitType && styles.continueButtonTextDisabled
                   ]}>
                     Continue
                   </Text>
                 </LinearGradient>
               </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  editButton: {
    padding: spacing.sm,
  },
  editButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  billTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  billIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
  },
  billTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  billDate: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    opacity: 0.9,
  },
  billAmountContainer: {
    marginBottom: spacing.lg,
  },
  billAmountLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.xs,
  },
  billAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  billAmountUSDC: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  billAmountEUR: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    opacity: 0.9,
  },
  splitInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitInfoLeft: {
    flex: 1,
  },
  splitInfoLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    marginRight: -8,
    borderWidth: 2,
    borderColor: colors.green,
  },
  avatarOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  avatarOverlayText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  participantsSection: {
    marginBottom: spacing.xl,
  },
  participantsTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  participantCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    marginRight: spacing.md,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  participantWallet: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  participantStatus: {
    alignItems: 'flex-end',
  },
  statusAccepted: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  statusPending: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.black,
  },
  splitButton: {
    backgroundColor: colors.green,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  splitButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    height: '65%',
    minHeight: 400,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent', // Debug: make sure content is visible
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  splitOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  splitOption: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 200,
    justifyContent: 'center',
    minWidth: 140,
  },
  splitOptionSelected: {
    borderColor: colors.green,
  },
  splitOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  splitOptionIconText: {
    fontSize: 28,
  },
  splitOptionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  splitOptionDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
  riskyModeLabel: {
    position: 'absolute',
    top: -6,
    left: -6,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  riskyModeIcon: {
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs,
  },
  riskyModeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  continueButton: {
    borderRadius: 12,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  continueButtonTextDisabled: {
    color: colors.textSecondary,
  },
});

export default SplitDetailsScreen;
