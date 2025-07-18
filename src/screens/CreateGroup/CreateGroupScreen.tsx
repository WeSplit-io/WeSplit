import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { styles } from './styles';
import { colors } from '../../theme';

// Category options matching the mockup
const CATEGORIES = [
  { id: 'trip', name: 'Trip', icon: 'briefcase' },
  { id: 'food', name: 'Food', icon: 'glass' },
  { id: 'home', name: 'Home', icon: 'home' },
  { id: 'event', name: 'Event', icon: 'megaphone' },
  { id: 'custom', name: 'Custom', icon: 'plus' }
];

// Color options matching the mockup - all green shades
const COLORS = [
  '#A5EA15', '#8BC34A', '#4CAF50', '#2E7D32', '#1B5E20', '#388E3C', '#66BB6A'
];

const CreateGroupScreen: React.FC<any> = ({ navigation }) => {
  const { state, createGroup } = useApp();
  const { currentUser } = state;
  
  const [selectedCategory, setSelectedCategory] = useState('trip'); // Default to Trip as in mockup
  const [selectedColor, setSelectedColor] = useState('#A5EA15'); // Default to first green
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    try {
      setIsCreating(true);
      
      const groupData = {
        name: title.trim(),
        description: description.trim(),
        category: selectedCategory || 'trip',
        currency: 'USDC',
        icon: selectedCategory || 'briefcase',
        color: selectedColor || '#A5EA15',
        created_by: currentUser.id,
      };

      const createdGroup = await createGroup(groupData);
      
      navigation.navigate('GroupCreated', { 
        groupId: createdGroup.id,
        groupName: title.trim(),
        groupIcon: selectedCategory || 'briefcase',
        groupColor: selectedColor || '#A5EA15'
      });
      
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMembers = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title first');
      return;
    }
    
    // Create the group first, then navigate to add members
    handleCreateGroupAndAddMembers();
  };

  const handleCreateGroupAndAddMembers = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    try {
      setIsCreating(true);
      
      const groupData = {
        name: title.trim(),
        description: description.trim(),
        category: selectedCategory || 'trip',
        currency: 'USDC',
        icon: selectedCategory || 'briefcase',
        color: selectedColor || '#A5EA15',
        created_by: currentUser.id,
      };

      const createdGroup = await createGroup(groupData);
      
      // Navigate to AddMembers with the created group ID
      navigation.navigate('AddMembers', { 
        groupId: createdGroup.id,
        fromCreation: true 
      });
      
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteViaLink = () => {
    // TODO: Implement invite via link functionality
    Alert.alert('Coming Soon', 'Invite via link feature will be available soon!');
  };

  const isFormValid = title.trim().length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Category Section */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryOption,
              selectedCategory === category.id && styles.categorySelected
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Icon 
              name={category.icon} 
              size={24} 
              color={selectedCategory === category.id ? colors.textDark : colors.textLightSecondary} 
            />
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextSelected
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Color Section */}
      <Text style={styles.label}>Color</Text>
      <View style={styles.colorRow}>
        {COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.colorSelected
            ]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </View>
      
      {/* Group Title */}
      <Text style={styles.label}>Group Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter a title"
        placeholderTextColor={colors.textPlaceholder}
        maxLength={50}
      />
      
      {/* Description */}
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Enter a description"
        placeholderTextColor={colors.textPlaceholder}
        multiline
        numberOfLines={3}
        maxLength={200}
      />

      {/* Members Section */}
      <Text style={styles.label}>Members</Text>
      
      {/* Current user (You) */}
      <View style={styles.memberItem}>
        <View style={styles.memberAvatar}>
          <Icon name="user" size={20} color={colors.textLight} />
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {currentUser?.name || 'User'}
          </Text>
          <Text style={styles.memberSubtext}>(You)</Text>
        </View>
      </View>

      {/* Add new members link */}
      <TouchableOpacity style={styles.addMembersLink} onPress={handleAddMembers}>
        <Icon name="user-plus" size={16} color={colors.primaryGreen} style={styles.linkIcon} />
        <Text style={styles.addMembersLinkText}>Add new members</Text>
      </TouchableOpacity>

      {/* Invite via link */}
      <TouchableOpacity style={styles.inviteLink} onPress={handleInviteViaLink}>
        <Icon name="link" size={16} color={colors.textLightSecondary} style={styles.linkIcon} />
        <Text style={styles.inviteLinkText}>Invite via link</Text>
      </TouchableOpacity>
      
      {/* Done Button */}
      <TouchableOpacity 
        style={[
          styles.doneButton, 
          !isFormValid && styles.doneButtonDisabled
        ]} 
        onPress={handleCreateGroup}
        disabled={!isFormValid || isCreating}
      >
        <Text style={[
          styles.doneButtonText,
          !isFormValid && styles.doneButtonTextDisabled
        ]}>
          {isCreating ? 'Creating...' : 'Create Group'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateGroupScreen; 