/**
 * Split Details Screen
 * Allows users to edit split details, add participants, and manage the bill split
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { 
  BillSplitCreationData, 
  BillParticipant, 
  BillItem,
  BillSplitNavigationParams 
} from '../../types/billSplitting';

interface RouteParams {
  splitId?: string;
  billData?: BillSplitCreationData;
}

interface SplitDetailsScreenProps {
  navigation: any;
}

const SplitDetailsScreen: React.FC<SplitDetailsScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { splitId, billData } = route.params as RouteParams;
  
  const [splitData, setSplitData] = useState<BillSplitCreationData>(
    billData || {
      title: '',
      description: '',
      totalAmount: 0,
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      location: '',
      merchant: '',
      billImageUrl: '',
      items: [],
      participants: [],
      settings: {
        allowPartialPayments: true,
        requireAllAccept: false,
        autoCalculate: true,
        splitMethod: 'equal',
      },
    }
  );
  
  const [participants, setParticipants] = useState<BillParticipant[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (splitId) {
      loadExistingSplit();
    } else {
      // Initialize with current user as first participant
      initializeWithCurrentUser();
    }
  }, [splitId]);

  const loadExistingSplit = async () => {
    // TODO: Load existing split data from backend
    console.log('Loading existing split:', splitId);
  };

  const initializeWithCurrentUser = () => {
    // TODO: Get current user data and add as first participant
    const currentUserParticipant: BillParticipant = {
      id: '1',
      userId: 'current_user_id',
      name: 'You',
      email: 'current@user.com',
      status: 'accepted',
      amountOwed: 0,
      items: [],
    };
    setParticipants([currentUserParticipant]);
  };

  const updateSplitData = (field: keyof BillSplitCreationData, value: any) => {
    setSplitData(prev => ({ ...prev, [field]: value }));
  };

  const addParticipant = () => {
    if (!newParticipant.name.trim()) {
      Alert.alert('Error', 'Please enter a name for the participant');
      return;
    }

    const participant: BillParticipant = {
      id: Date.now().toString(),
      userId: `user_${Date.now()}`,
      name: newParticipant.name.trim(),
      email: newParticipant.email.trim(),
      phoneNumber: newParticipant.phoneNumber.trim(),
      status: 'pending',
      amountOwed: 0,
      items: [],
    };

    setParticipants(prev => [...prev, participant]);
    setNewParticipant({ name: '', email: '', phoneNumber: '' });
    setShowAddParticipant(false);
  };

  const removeParticipant = (participantId: string) => {
    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setParticipants(prev => prev.filter(p => p.id !== participantId));
          },
        },
      ]
    );
  };

  const calculateAmounts = () => {
    if (splitData.settings.splitMethod === 'equal') {
      const amountPerPerson = splitData.totalAmount / participants.length;
      setParticipants(prev =>
        prev.map(p => ({ ...p, amountOwed: amountPerPerson }))
      );
    } else if (splitData.settings.splitMethod === 'by_items') {
      // Calculate based on items assigned to each participant
      // This would be more complex in a real implementation
      const amountPerPerson = splitData.totalAmount / participants.length;
      setParticipants(prev =>
        prev.map(p => ({ ...p, amountOwed: amountPerPerson }))
      );
    }
  };

  const saveSplit = async () => {
    try {
      // TODO: Save split to backend
      console.log('Saving split:', { ...splitData, participants });
      
      Alert.alert(
        'Split Created',
        'Your bill split has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SplitsList'),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving split:', error);
      Alert.alert('Error', 'Failed to save split. Please try again.');
    }
  };

  const renderParticipant = ({ item }: { item: BillParticipant }) => (
    <View style={styles.participantCard}>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{item.name}</Text>
        {item.email && <Text style={styles.participantEmail}>{item.email}</Text>}
        <Text style={styles.participantAmount}>
          ${item.amountOwed.toFixed(2)}
        </Text>
      </View>
      
      <View style={styles.participantActions}>
        <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
            {item.status}
          </Text>
        </View>
        
        {item.id !== '1' && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeParticipant(item.id)}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'accepted':
        return { backgroundColor: colors.success + '20' };
      case 'pending':
        return { backgroundColor: colors.warning + '20' };
      case 'declined':
        return { backgroundColor: colors.error + '20' };
      default:
        return { backgroundColor: colors.surface };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'accepted':
        return { color: colors.success };
      case 'pending':
        return { color: colors.warning };
      case 'declined':
        return { color: colors.error };
      default:
        return { color: colors.textSecondary };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {splitId ? 'Edit Split' : 'Create Split'}
        </Text>
        
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveSplit}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Split Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Split Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={splitData.title}
              onChangeText={(text) => updateSplitData('title', text)}
              placeholder="Enter split title"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={splitData.description}
              onChangeText={(text) => updateSplitData('description', text)}
              placeholder="Add a description"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.textInput}
                value={splitData.date}
                onChangeText={(text) => updateSplitData('date', text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Total Amount</Text>
              <TextInput
                style={styles.textInput}
                value={splitData.totalAmount.toString()}
                onChangeText={(text) => updateSplitData('totalAmount', parseFloat(text) || 0)}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Merchant/Location</Text>
            <TextInput
              style={styles.textInput}
              value={splitData.merchant}
              onChangeText={(text) => updateSplitData('merchant', text)}
              placeholder="Restaurant, store, etc."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Participants Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddParticipant(true)}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.participantsList}
          />
          
          <View style={styles.calculationInfo}>
            <Text style={styles.calculationText}>
              Total: ${splitData.totalAmount.toFixed(2)}
            </Text>
            <Text style={styles.calculationText}>
              Per person: ${(splitData.totalAmount / participants.length).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Split Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Split Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Split Method</Text>
            <View style={styles.settingOptions}>
              <TouchableOpacity
                style={[
                  styles.settingOption,
                  splitData.settings.splitMethod === 'equal' && styles.settingOptionActive
                ]}
                onPress={() => updateSplitData('settings', {
                  ...splitData.settings,
                  splitMethod: 'equal'
                })}
              >
                <Text style={[
                  styles.settingOptionText,
                  splitData.settings.splitMethod === 'equal' && styles.settingOptionTextActive
                ]}>
                  Equal
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.settingOption,
                  splitData.settings.splitMethod === 'by_items' && styles.settingOptionActive
                ]}
                onPress={() => updateSplitData('settings', {
                  ...splitData.settings,
                  splitMethod: 'by_items'
                })}
              >
                <Text style={[
                  styles.settingOptionText,
                  splitData.settings.splitMethod === 'by_items' && styles.settingOptionTextActive
                ]}>
                  By Items
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Participant Modal */}
      <Modal
        visible={showAddParticipant}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddParticipant(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Add Participant</Text>
            
            <TouchableOpacity onPress={addParticipant}>
              <Text style={styles.modalSaveText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newParticipant.name}
                onChangeText={(text) => setNewParticipant(prev => ({ ...prev, name: text }))}
                placeholder="Enter name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={newParticipant.email}
                onChangeText={(text) => setNewParticipant(prev => ({ ...prev, email: text }))}
                placeholder="Enter email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={newParticipant.phoneNumber}
                onChangeText={(text) => setNewParticipant(prev => ({ ...prev, phoneNumber: text }))}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    padding: spacing.sm,
  },
  saveButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
    marginRight: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  participantsList: {
    marginBottom: spacing.md,
  },
  participantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  participantEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  participantAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  participantActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
  },
  calculationInfo: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  calculationText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  settingRow: {
    marginBottom: spacing.md,
  },
  settingLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  settingOptions: {
    flexDirection: 'row',
  },
  settingOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  settingOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  settingOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  settingOptionTextActive: {
    color: colors.white,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  modalSaveText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
});

export default SplitDetailsScreen;
