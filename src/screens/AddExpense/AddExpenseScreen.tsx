import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Image, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from '../../components/Icon';
import GroupIcon from '../../components/GroupIcon';
import { useApp } from '../../context/AppContext';
import { useGroupList, useExpenseOperations } from '../../hooks/useGroupData';
import { GroupWithDetails, GroupMember } from '../../types';
import { SOLANA_CRYPTOCURRENCIES, Cryptocurrency } from '../../utils/cryptoUtils';
import { convertToUSDC } from '../../services/priceService';
import { firebaseDataService } from '../../services/firebaseDataService';
import { styles } from './styles';
import { colors } from '../../theme/colors';

// Updated categories with more vibrant colors matching the screenshots
const categories = [
  { name: 'Trip', icon: 'map-pin', color: '#A5EA15' },
  { name: 'Food', icon: 'coffee', color: '#FFB800' },
  { name: 'Home', icon: 'home', color: '#00BFA5' },
  { name: 'Event', icon: 'briefcase', color: '#FF6B35' },
];

const AddExpenseScreen: React.FC<any> = ({ navigation, route }) => {
  const { state, createExpense } = useApp();
  const { currentUser } = state;
  
  // Use new hooks for data management
  const { groups, loading: groupsLoading } = useGroupList();
  
  const groupId = route.params?.groupId;
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [selectedCurrency, setSelectedCurrency] = useState<Cryptocurrency>(SOLANA_CRYPTOCURRENCIES[0]);
  const [splitType, setSplitType] = useState<'equal' | 'manual'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<(string | number)[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{[key: string | number]: string}>({});
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showManualTransition, setShowManualTransition] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [paidBy, setPaidBy] = useState<string | number>('');
  const [showPaidBySelector, setShowPaidBySelector] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Validation states
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use expense operations hook - Initialize with selected group ID
  const { 
    createExpense: handleCreateExpense, 
    loading: expenseLoading,
    getGroupMembers,
    error: expenseError,
    clearError
  } = useExpenseOperations(selectedGroup?.id ? selectedGroup.id : (groupId ? groupId : (groups[0]?.id ? groups[0].id : '')));

  // Set initial group when data loads
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      // Set selected group based on route param or first group
      const initialGroup = groupId 
        ? groups.find(g => g.id === (typeof groupId === 'string' ? groupId : Number(groupId))) 
        : groups[0];
        
      if (initialGroup) {
        setSelectedGroup(initialGroup);
        // Initialize selected members with all group members (use real id)
        setSelectedMembers(initialGroup.members.map(m => m.id));
        // Initialize paidBy with current user
        if (currentUser?.id) {
          setPaidBy(currentUser.id);
        }
      }
    }
  }, [groups, groupId, selectedGroup, currentUser]);

  // Get group members using the hook instead of API call
  const groupMembers = getGroupMembers();

  // Update selected members when group changes
  useEffect(() => {
    if (selectedGroup && groupMembers.length > 0) {
      setSelectedMembers(groupMembers.map(m => m.id));
      setCustomAmounts({});
    }
  }, [selectedGroup, groupMembers]);

  // Validate form data
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    // Validate group selection
    if (!selectedGroup) {
      errors.group = 'Please select a group';
    }

    // Validate description
    if (!description.trim()) {
      errors.description = 'Please enter a description';
    } else if (description.trim().length < 3) {
      errors.description = 'Description must be at least 3 characters';
    }

    // Validate amount
    if (!amount || amount.trim() === '') {
      errors.amount = 'Please enter an amount';
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.amount = 'Please enter a valid amount greater than 0';
      }
    }

    // Validate payer
    if (!paidBy) {
      errors.payer = 'Please select who paid for this expense';
    }

    // Validate selected members
    if (selectedMembers.length === 0) {
      errors.members = 'Please select at least one member to split with';
    }

    // Validate split method
    if (splitType === 'manual') {
      const totalSplitAmount = selectedMembers.reduce((sum: number, memberId) => {
        const memberKey = String(memberId);
        const memberAmount = parseFloat(customAmounts[memberKey] || '0');
        return sum + (isNaN(memberAmount) ? 0 : memberAmount);
      }, 0);
      
      const expenseAmount = parseFloat(amount);
      if (Math.abs(totalSplitAmount - expenseAmount) > 0.01) {
        errors.split = 'Total split amount must equal the expense amount';
      }
    }

    // Validate that selected members are from the current group
    if (selectedGroup && selectedMembers.length > 0) {
      const groupMemberIds = selectedGroup.members.map(m => m.id);
      const invalidMembers = selectedMembers.filter(memberId => !groupMemberIds.includes(memberId));
      if (invalidMembers.length > 0) {
        errors.members = 'Selected members must be from the current group';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear validation errors when form changes
  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  const handleGroupSelect = (group: GroupWithDetails) => {
    setSelectedGroup(group);
    setShowGroupSelector(false);
    clearValidationErrors();
    // Members will be automatically available from the hook
  };

  const handleMemberToggle = (memberId: string | number) => {
    if (splitType === 'equal') {
      // If trying to deselect in equal mode, switch to manual
      if (selectedMembers.includes(memberId)) {
        setSplitType('manual');
        setShowManualTransition(true);
        setTimeout(() => setShowManualTransition(false), 300);
      }
      setSelectedMembers(prev => prev.filter(id => id !== memberId));
    } else {
      // Manual mode: toggle selection
      setSelectedMembers(prev => 
        prev.includes(memberId) 
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      );
    }
    clearValidationErrors();
  };

  const getTotalAmount = () => {
    if (splitType === 'equal') {
      return parseFloat(amount) || 0;
    } else {
      return selectedMembers.reduce((sum: number, memberId) => {
        const memberKey = String(memberId);
        const memberAmount = parseFloat(customAmounts[memberKey] || '0');
        return sum + (isNaN(memberAmount) ? 0 : memberAmount);
      }, 0);
    }
  };

  const getAmountPerPerson = () => {
    const total = parseFloat(amount) || 0;
    const memberCount = selectedMembers.length;
    return memberCount > 0 ? total / memberCount : 0;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleManualAmountChange = (memberId: string | number, value: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [memberId]: value
    }));
    clearValidationErrors();
  };

  const handleSplitTypeChange = (newSplitType: 'equal' | 'manual') => {
    setSplitType(newSplitType);
    clearValidationErrors();
    
    if (newSplitType === 'equal') {
      // Reset custom amounts when switching to equal
      setCustomAmounts({});
    } else {
      // Initialize custom amounts with equal split when switching to manual
      const amountPerPerson = getAmountPerPerson();
      const newCustomAmounts: {[key: string | number]: string} = {};
      selectedMembers.forEach(memberId => {
        newCustomAmounts[memberId] = amountPerPerson.toFixed(2);
      });
      setCustomAmounts(newCustomAmounts);
    }
  };

  const handleSaveExpense = async () => {
    try {
      // Clear previous errors
      clearValidationErrors();
      
      // Validate form
      if (!validateForm()) {
        const errorMessages = Object.values(validationErrors).join('\n');
        Alert.alert('Validation Error', errorMessages);
        return;
      }

      // Check for offline mode
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert('Offline Mode', 'You are currently offline. Please check your connection and try again.');
        return;
      }

      setIsSubmitting(true);

      if (!selectedGroup || !currentUser?.id) {
        Alert.alert('Error', 'Please select a group and ensure you are logged in');
        return;
      }

      if (!description.trim()) {
        Alert.alert('Error', 'Please enter a description');
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount greater than 0');
        return;
      }

      if (!paidBy) {
        Alert.alert('Error', 'Please select who paid for this expense');
        return;
      }

      if (selectedMembers.length === 0) {
        Alert.alert('Error', 'Please select at least one member to split with');
        return;
      }

      // Validate that selected members are from the current group
      const groupMemberIds = selectedGroup.members.map(m => m.id);
      const invalidMembers = selectedMembers.filter(memberId => !groupMemberIds.includes(memberId));
      if (invalidMembers.length > 0) {
        Alert.alert('Error', 'Selected members must be from the current group');
        return;
      }

      // Validate split amounts
      if (splitType === 'manual') {
        const totalSplitAmount = selectedMembers.reduce((sum, memberId) => {
          const memberAmount = parseFloat(customAmounts[String(memberId)] || '0');
          return sum + (isNaN(memberAmount) ? 0 : memberAmount);
        }, 0);
        
        const expenseAmount = parseFloat(amount);
        if (Math.abs(totalSplitAmount - expenseAmount) > 0.01) {
          Alert.alert('Error', 'Total split amount must equal the expense amount');
          return;
        }
      }

      const expenseData = {
        group_id: selectedGroup.id,
        description: description.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        paid_by: paidBy,
        category: selectedCategory,
        date: date.toISOString(),
        split_type: splitType,
        split_data: splitType === 'equal' 
          ? selectedMembers.map(memberId => ({ user_id: memberId, amount: getAmountPerPerson() }))
          : selectedMembers.map(memberId => ({ 
              user_id: memberId, 
              amount: parseFloat(customAmounts[String(memberId)] || '0') 
            })),
        receipt_image: selectedImage,
        converted_amount: convertedAmount,
        converted_currency: 'USDC'
      };

      console.log('🔄 AddExpenseScreen: Creating expense with data:', expenseData);

      // Use context method to create expense
      const result = await createExpense(expenseData);

      console.log('✅ AddExpenseScreen: Expense created successfully:', result);

      // Send notifications to all group members except the payer
      try {
        const membersToNotify = selectedGroup.members.filter(member => member.id !== paidBy);
        
        for (const member of membersToNotify) {
          // Ensure member.id is valid before creating notification
          if (!member.id) {
            console.warn('⚠️ AddExpenseScreen: Skipping notification for member without ID:', member);
            continue;
          }
          
          // Debug logging for notification creation
          console.log('🔄 AddExpenseScreen: Creating notification for member:', {
            memberId: member.id,
            memberName: member.name,
            userId: String(member.id)
          });
          
          await firebaseDataService.notification.createNotification({
            userId: String(member.id),
            type: 'expense_added',
            title: 'New Expense Added',
            message: `${currentUser?.name || 'Someone'} added a new expense: ${description}`,
            data: {
              groupId: selectedGroup.id,
              expenseId: result.id,
              amount: parseFloat(amount),
              currency: selectedCurrency.symbol,
              paidBy: paidBy,
              description: description.trim()
            },
            is_read: false
          });
        }

        console.log('✅ AddExpenseScreen: Notifications sent to', membersToNotify.length, 'members');
      } catch (notificationError) {
        console.error('❌ AddExpenseScreen: Error sending notifications:', notificationError);
        // Don't fail the expense creation if notifications fail
      }

      // Navigate to success screen
      const successParams = {
        expense: result,
        group: selectedGroup,
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        convertedAmount: convertedAmount
      };
      
      console.log('🔄 AddExpenseScreen: Navigating to ExpenseSuccess with params:', {
        groupId: selectedGroup?.id,
        groupName: selectedGroup?.name,
        expenseId: result?.id
      });
      
      navigation.navigate('ExpenseSuccess', successParams);

    } catch (error) {
      console.error('❌ AddExpenseScreen: Error creating expense:', error);
      
      let errorMessage = 'Failed to create expense. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = 'You do not have permission to add expenses to this group.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Invalid expense data. Please check your inputs.';
        } else if (error.message.includes('offline')) {
          errorMessage = 'You are currently offline. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show error from hook if any
  useEffect(() => {
    if (expenseError) {
      Alert.alert('Error', expenseError);
    }
  }, [expenseError]);

  // Real-time conversion preview
  useEffect(() => {
    const updateConversionPreview = async () => {
      if (amount && selectedCurrency.symbol !== 'USDC') {
        try {
          const amountNum = parseFloat(amount);
          if (!isNaN(amountNum)) {
            const usdcAmount = await convertToUSDC(amountNum, selectedCurrency.symbol);
            setConvertedAmount(usdcAmount);
          }
        } catch (error) {
          console.error('Error updating conversion preview:', error);
          setConvertedAmount(null);
        }
      } else {
        setConvertedAmount(null);
      }
    };

    updateConversionPreview();
  }, [amount, selectedCurrency.symbol]);

  const handleImagePicker = async () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => handleTakePhoto()
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => handleChooseFromGallery()
        }
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your camera');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        console.log('Photo taken:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        console.log('Selected image:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const openDatePicker = () => {
    setTempDate(date); // Initialize temp date with current date
    setShowDatePicker(true);
  };

  const handleDoneDatePicker = () => {
    setDate(tempDate);
    setShowDatePicker(false);
  };

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
              style={styles.iconWrapper}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="users" size={64} color="#A89B9B" />
          <Text style={styles.emptyStateText}>No Groups Found</Text>
          <Text style={styles.emptyStateSubtext}>You need to be part of a group to add expenses</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.emptyStateButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={handleImagePicker}>
          <View style={styles.cameraIconContainer}>
            <Image
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcamera-icon.png?alt=media&token=bd15c73f-252c-4bb5-b1e8-f6dce6b186e4' }}
              style={styles.iconWrapper}
            />
            {selectedImage && <View style={styles.cameraIndicator} />}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>

        {/* Expense Name */}
        <Text style={styles.sectionLabel}>Expense Name</Text>
        <TextInput
          style={styles.textInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Expense Name"
          placeholderTextColor={colors.white70}
          keyboardType="default"
        />

        {/* Receipt Section */}
        <View style={styles.imageContainer}>
          <View style={styles.receiptHeader}>
            <Text style={styles.sectionLabel}>Receipt</Text>
            {selectedImage && (
              <TouchableOpacity 
                style={styles.removeReceiptButton}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.removeReceiptText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {selectedImage ? (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addReceiptButton}
              onPress={handleImagePicker}
            >
              <View style={styles.addReceiptContent}>
                <Image
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcamera-icon.png?alt=media&token=bd15c73f-252c-4bb5-b1e8-f6dce6b186e4' }}
                  style={styles.addReceiptIcon}
                />
                <Text style={styles.addReceiptText}>Add Receipt</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Date */}
        <Text style={styles.sectionLabel}>Date</Text>
        <TouchableOpacity style={styles.dateInput} onPress={openDatePicker}>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcalendar-icon.png?alt=media&token=72c78717-b0c3-4662-a8ca-4a42e90f0339' }}
            style={styles.dateIcon}
          />
        </TouchableOpacity>

        {/* Amount */}
        <Text style={styles.sectionLabel}>Amount</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(text) => {
              // Only allow numbers and decimal point
              const filteredText = text.replace(/[^0-9.]/g, '');
              // Ensure only one decimal point
              const parts = filteredText.split('.');
              if (parts.length <= 2) {
                setAmount(filteredText);
              }
            }}
            placeholder="00.00"
            placeholderTextColor={colors.white70}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity 
            style={styles.currencyButton}
            onPress={() => setShowCurrencyPicker(true)}
          >
            <Text style={styles.currencyButtonText}>{selectedCurrency.symbol}</Text>
            <Icon name="chevron-down" size={16} color="#A89B9B" />
          </TouchableOpacity>
        </View>

        {amount && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>
              Total: {Number(getTotalAmount()).toFixed(3)} {selectedCurrency.symbol}
            </Text>
            {isConverting && (
              <Text style={styles.convertingText}>
                Converting to USDC...
              </Text>
            )}
            {convertedAmount && selectedCurrency.symbol !== 'USDC' && (
              <Text style={styles.convertedText}>
                ≈ {convertedAmount.toFixed(2)} USDC
              </Text>
            )}
          </View>
        )}

        {/* Paid By */}
        <Text style={styles.sectionLabel}>Paid By</Text>
        <TouchableOpacity 
          style={styles.paidBySelector}
          onPress={() => setShowPaidBySelector(true)}
        >
          <View style={styles.paidByInfo}>
            <View style={styles.paidByAvatar}>
              {groupMembers.find(m => m.id === paidBy)?.avatar ? (
                <Image
                  source={{ uri: groupMembers.find(m => m.id === paidBy)?.avatar }}
                  style={styles.paidByAvatarImage}
                  defaultSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
                />
              ) : (
                <Text style={styles.paidByAvatarText}>
                  {groupMembers.find(m => m.id === paidBy)?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <View style={styles.paidByDetails}>
              <Text style={styles.paidByName}>
                {groupMembers.find(m => m.id === paidBy)?.name || 'Select who paid'}
              </Text>
              <Text style={styles.paidByEmail}>
                {groupMembers.find(m => m.id === paidBy)?.email || ''}
              </Text>
            </View>
          </View>
          <Icon name="chevron-down" size={20} color="#A89B9B" />
        </TouchableOpacity>

        {/* Split Amount */}
        <View style={styles.splitHeader}>
          <Text style={styles.sectionLabel}>Split Amount</Text>
          <View style={styles.splitToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, splitType === 'equal' && styles.toggleButtonActive]}
              onPress={() => handleSplitTypeChange('equal')}
            >
              <Text style={[styles.toggleText, splitType === 'equal' && styles.toggleTextActive]}>
                Equal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, splitType === 'manual' && styles.toggleButtonActive]}
              onPress={() => handleSplitTypeChange('manual')}
            >
              <Text style={[styles.toggleText, splitType === 'manual' && styles.toggleTextActive]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transition Notification */}
        {showManualTransition && (
          <View style={styles.transitionNotification}>
            <Icon name="info" size={16} color="#A5EA15" />
            <Text style={styles.transitionText}>Switched to manual split mode</Text>
          </View>
        )}

        {/* Members List */}
        {groupMembers.map((member, index) => {
          const isSelected = selectedMembers.includes(member.id);
          const memberAmount = splitType === 'equal' 
            ? getAmountPerPerson() 
            : parseFloat(customAmounts[String(member.id)] || '0');
          
          // Determine which currency to display
          const displayCurrency = selectedCurrency.symbol;

          return (
            <TouchableOpacity 
              key={`${member.id}-${index}`}
              style={[styles.memberRow, isSelected && styles.memberRowSelected]}
              onPress={() => handleMemberToggle(member.id)}
            >
              <View style={styles.memberRadio}>
                <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                  {isSelected && <View style={styles.radioButtonInner} />}
                </View>
              </View>
              
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberHandle}>
                  {member.email.split('@')[0]}...{member.email.split('@')[0].slice(-3)}
                </Text>
              </View>
              
              {isSelected && amount && splitType === 'equal' && (
                <Text style={styles.memberAmount}>
                  ${memberAmount.toFixed(2)}
                </Text>
              )}
              
              {isSelected && splitType === 'manual' && amount && (
                <View style={styles.manualAmountInline}>
                  <TextInput
                    style={styles.manualAmountInput}
                    value={customAmounts[String(member.id)] || '0'}
                    onChangeText={(value) => {
                      // Only allow numbers and decimal point
                      const filteredText = value.replace(/[^0-9.]/g, '');
                      // Ensure only one decimal point
                      const parts = filteredText.split('.');
                      if (parts.length <= 2) {
                        handleManualAmountChange(member.id, filteredText);
                      }
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#A89B9B"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.manualAmountCurrency}>{displayCurrency}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!description.trim() || !amount || selectedMembers.length === 0 || expenseLoading) && styles.saveButtonDisabled
          ]}
          onPress={handleSaveExpense}
          disabled={!description.trim() || !amount || selectedMembers.length === 0 || expenseLoading}
        >
          {expenseLoading ? (
            <ActivityIndicator size="small" color="#212121" />
          ) : (
            <Text style={[
              styles.saveButtonText,
              (!description.trim() || !amount || selectedMembers.length === 0 || expenseLoading) && styles.saveButtonTextDisabled
            ]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyPicker(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.currencyModalOverlay}>
          <TouchableOpacity
            style={styles.currencyOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowCurrencyPicker(false)}
          >
            <View style={styles.currencyModalContent}>
              {/* Handle bar for slide down */}
              <View style={styles.currencyHandle} />

              {/* Title */}
              <Text style={styles.currencyModalTitle}>Select Currency</Text>

              <ScrollView 
                style={styles.currencyContent} 
                contentContainerStyle={styles.currencyContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {SOLANA_CRYPTOCURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency.symbol}
                    style={[
                      styles.currencyOption,
                      selectedCurrency.symbol === currency.symbol && styles.currencyOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedCurrency(currency);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                    <Text style={styles.currencyName}>{currency.name}</Text>
                    {selectedCurrency.symbol === currency.symbol && (
                      <Icon name="check" size={20} color="#A5EA15" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Paid By Selector Modal */}
      <Modal
        visible={showPaidBySelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaidBySelector(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.paidByModalOverlay}>
          <TouchableOpacity
            style={styles.paidByOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowPaidBySelector(false)}
          >
            <View style={styles.paidByModalContent}>
              {/* Handle bar for slide down */}
              <View style={styles.paidByHandle} />

              {/* Title */}
              <Text style={styles.paidByModalTitle}>Who Paid?</Text>

              <ScrollView 
                style={styles.paidByContent} 
                contentContainerStyle={styles.paidByContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {groupMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.currencyOption,
                      paidBy === member.id && styles.currencyOptionSelected
                    ]}
                    onPress={() => {
                      setPaidBy(member.id);
                      setShowPaidBySelector(false);
                    }}
                  >
                    <View style={styles.paidByOptionContent}>
                      <View style={styles.paidByOptionAvatar}>
                        {member.avatar ? (
                          <Image
                            source={{ uri: member.avatar }}
                            style={styles.paidByOptionAvatarImage}
                            defaultSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
                          />
                        ) : (
                          <Text style={styles.paidByOptionAvatarText}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.paidByOptionDetails}>
                        <Text style={styles.paidByOptionName}>{member.name}</Text>
                        <Text style={styles.paidByOptionEmail}>{member.email}</Text>
                      </View>
                    </View>
                    {paidBy === member.id && (
                      <Icon name="check" size={20} color="#A5EA15" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Done Button */}
              <TouchableOpacity 
                style={styles.paidByDoneButton} 
                onPress={() => setShowPaidBySelector(false)}
              >
                <Text style={styles.paidByDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.datePickerModalOverlay}>
          <TouchableOpacity
            style={styles.datePickerOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerModalContent}>
              {/* Handle bar for slide down */}
              <View style={styles.datePickerHandle} />

              {/* Title */}
              <Text style={styles.datePickerModalTitle}>Select Date</Text>

              <View style={styles.datePickerWrapper}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  style={styles.datePicker}
                  textColor="#FFF"
                />
              </View>

              {/* Done Button */}
              <TouchableOpacity 
                style={styles.datePickerDoneButton} 
                onPress={handleDoneDatePicker}
              >
                <Text style={styles.datePickerDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AddExpenseScreen; 