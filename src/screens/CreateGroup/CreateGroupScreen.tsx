import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { createGroup } from '../../services/groupService';
import { styles } from './styles';
import { colors } from '../../theme';

// Predefined icon options matching our database design
const PREDEFINED_ICONS = [
  'people', 'restaurant', 'car', 'home', 'airplane', 'business',
  'school', 'fitness-center', 'local-movies', 'shopping-cart',
  'beach-access', 'pets', 'sports-soccer', 'music-note'
];

// Predefined color options matching our database design
const PREDEFINED_COLORS = [
  '#A5EA15', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471',
  '#82E0AA', '#F1948A'
];

const CreateGroupScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [selectedIcon, setSelectedIcon] = useState('people');
  const [selectedColor, setSelectedColor] = useState('#A5EA15');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
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
        category: 'general', // We'll derive this from the icon later
        currency: 'USDC',
        icon: selectedIcon,
        color: selectedColor,
        createdBy: currentUser.id,
        members: [],
      };

      const createdGroup = await createGroup(groupData);
      
      // Navigate to success screen instead of alert
      navigation.navigate('GroupCreated', { 
        groupId: createdGroup.id,
        groupName: title.trim(),
        groupIcon: selectedIcon,
        groupColor: selectedColor
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
    
    // Create a temporary group data to pass to add members
    const tempGroupData = {
      name: title.trim(),
      description: description.trim(),
      icon: selectedIcon,
      color: selectedColor,
      isTemporary: true
    };
    
    navigation.navigate('AddMembers', { 
      groupData: tempGroupData,
      fromCreation: true 
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Icon Selection */}
      <Text style={styles.label}>Choose Icon</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScrollView}>
        <View style={styles.iconRow}>
          {PREDEFINED_ICONS.map((iconName) => (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconOption,
                { backgroundColor: selectedColor },
                selectedIcon === iconName && styles.iconSelected
              ]}
              onPress={() => setSelectedIcon(iconName)}
            >
              <Icon name={iconName} size={28} color="#212121" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Color Selection */}
      <Text style={styles.label}>Choose Color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScrollView}>
        <View style={styles.colorRow}>
          {PREDEFINED_COLORS.map((color) => (
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
      </ScrollView>
      
      {/* Group Details */}
      <Text style={styles.label}>Group Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter group name"
        placeholderTextColor={colors.darkGray}
        maxLength={50}
      />
      
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="What's this group for?"
        placeholderTextColor={colors.darkGray}
        multiline
        numberOfLines={3}
        maxLength={200}
      />

      {/* Members Section */}
      <Text style={styles.label}>Members</Text>
      <TouchableOpacity style={styles.addMembersButton} onPress={handleAddMembers}>
        <Icon name="user-plus" size={20} color={colors.primaryGreen} />
        <Text style={styles.addMembersText}>Add members</Text>
        <Icon name="chevron-right" size={20} color={colors.textLightSecondary} />
      </TouchableOpacity>
      
      {/* Create Button */}
      <TouchableOpacity 
        style={[styles.createButton, isCreating && styles.createButtonDisabled]} 
        onPress={handleCreateGroup}
        disabled={isCreating}
      >
        <Text style={styles.createButtonText}>
          {isCreating ? 'Creating...' : 'Done'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateGroupScreen; 