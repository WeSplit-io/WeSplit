import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { createGroup, joinGroupViaInvite } from '../services/groupService';

const categories = [
  { name: 'Travel', icon: 'map-pin', color: '#A5A6F6' },
  { name: 'Food', icon: 'coffee', color: '#B5C99A' },
  { name: 'Work', icon: 'briefcase', color: '#F7C873' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#FF6B6B' },
  { name: 'Home', icon: 'home', color: '#4ECDC4' },
  { name: 'Other', icon: 'more-horizontal', color: '#95A5A6' },
];

const CreateGroupScreen: React.FC<any> = ({ navigation }) => {
  const { state, addGroup } = useApp();
  const { currentUser } = state;
  
  const [selectedCat, setSelectedCat] = useState(0);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const handleDone = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title');
      return;
    }

    if (!desc.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    try {
      const groupData = {
      name: title.trim(),
      description: desc.trim(),
      category: categories[selectedCat].name.toLowerCase(),
        currency: 'USDC',
        createdBy: currentUser.id,
        members: [],
    };

      const createdGroup = await createGroup(groupData);
    
    Alert.alert(
      'Group Created!',
      'Your group has been created successfully. What would you like to do next?',
      [
        {
          text: 'Back to Dashboard',
          style: 'cancel',
          onPress: () => navigation.navigate('Dashboard'),
        },
        {
          text: 'Add Members',
            onPress: () => navigation.navigate('AddMembers', { groupId: createdGroup.id.toString() }),
        },
        {
          text: 'Add First Expense',
          onPress: () => navigation.navigate('AddExpense'),
        },
      ]
    );
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  const handleAddMembers = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title first');
      return;
    }
    navigation.navigate('AddMembers', { groupId: 'new' });
  };

  const handleInviteLink = () => {
    Alert.alert('Invite Link', 'Share this link with your friends to invite them to the group:\n\nhttps://wesplit.app/join/group123');
  };

  const handleInviteTelegram = () => {
    Alert.alert('Telegram Invite', 'Share this group on Telegram:\n\nhttps://t.me/share/url?url=https://wesplit.app/join/group123');
  };

  const handleInviteWhatsApp = () => {
    Alert.alert('WhatsApp Invite', 'Share this group on WhatsApp:\n\nhttps://wa.me/?text=Join%20my%20WeSplit%20group:%20https://wesplit.app/join/group123');
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    try {
      const result = await joinGroupViaInvite(inviteCode.trim(), String(currentUser.id));
      
      Alert.alert(
        'Success!',
        `You have successfully joined "${result.groupName}"!`,
        [
          {
            text: 'Go to Group',
            onPress: () => navigation.navigate('GroupDetails', { groupId: result.groupId }),
          },
          {
            text: 'Back to Dashboard',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Error joining group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join group. Please check the invite code and try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Group</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.catRow}>
        {categories.map((cat, idx) => (
          <TouchableOpacity
            key={cat.name}
            style={[styles.catIconWrap, selectedCat === idx && styles.catIconSelected]}
            onPress={() => setSelectedCat(idx)}
          >
            <Icon name={cat.icon} color={cat.color} size={28} />
            <Text style={styles.catIconLabel}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.label}>Group Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Group name"
        placeholderTextColor="#A89B9B"
      />
      
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 60 }]}
        value={desc}
        onChangeText={setDesc}
        placeholder="Description"
        placeholderTextColor="#A89B9B"
        multiline
      />
      
      <Text style={styles.label}>Join Group by Code</Text>
      
      <View style={styles.inviteOptions}>
        <TextInput
          style={styles.input}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Enter invite code"
          placeholderTextColor="#A89B9B"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.addPhoneBtn} onPress={handleJoinByCode}>
          <Text style={styles.addPhoneBtnText}>Join Group</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Invite Members</Text>
      
      <TouchableOpacity style={styles.linkRow} onPress={() => setShowInviteOptions(!showInviteOptions)}>
        <Icon name="user-plus" size={20} color="#A5EA15" />
        <Text style={styles.linkText}>Add members by phone number</Text>
        <Icon name="chevron-down" size={20} color="#A89B9B" />
      </TouchableOpacity>

      {showInviteOptions && (
        <View style={styles.inviteOptions}>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter phone number"
            placeholderTextColor="#A89B9B"
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.addPhoneBtn} onPress={handleAddMembers}>
            <Text style={styles.addPhoneBtnText}>Add Member</Text>
            </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity style={styles.linkRow} onPress={handleInviteLink}>
        <Icon name="link" size={20} color="#A5EA15" />
        <Text style={styles.linkText}>Invite via link</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.linkRow} onPress={handleInviteTelegram}>
        <Icon name="message-circle" size={20} color="#A5EA15" />
        <Text style={styles.linkText}>Invite via Telegram</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.linkRow} onPress={handleInviteWhatsApp}>
        <Icon name="message-circle" size={20} color="#A5EA15" />
        <Text style={styles.linkText}>Invite via WhatsApp</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
        <Text style={styles.doneBtnText}>Create Group</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  label: {
    fontSize: fontSizes.sm,
    color: '#A89B9B',
    marginTop: spacing.md,
    marginBottom: 4,
    fontWeight: fontWeights.medium as any,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  catIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: '#212121',
    borderWidth: 1,
    borderColor: '#FFF',
    width: '30%',
  },
  catIconSelected: {
    borderWidth: 2,
    borderColor: '#A5EA15',
    backgroundColor: '#212121',
  },
  catIconLabel: {
    fontSize: fontSizes.xs,
    color: '#A89B9B',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#212121',
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: spacing.md,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: radii.input,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: fontSizes.md,
    color: '#FFF',
  },
  currencyPicker: {
    backgroundColor: '#212121',
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  currencyOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF',
  },
  currencyOptionSelected: {
    backgroundColor: '#A5EA15',
  },
  currencyOptionText: {
    fontSize: fontSizes.md,
    color: '#FFF',
  },
  currencyOptionTextSelected: {
    color: '#212121',
    fontWeight: fontWeights.semibold as any,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: radii.input,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  linkText: {
    fontSize: fontSizes.md,
    color: '#FFF',
    marginLeft: spacing.md,
  },
  doneBtn: {
    backgroundColor: '#A5EA15',
    borderRadius: radii.input,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  doneBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: '#212121',
  },
  inviteOptions: {
    marginBottom: spacing.md,
  },
  addPhoneBtn: {
    backgroundColor: '#A5EA15',
    borderRadius: radii.input,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addPhoneBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: '#212121',
  },
});

export default CreateGroupScreen; 