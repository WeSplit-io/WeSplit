import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, Image } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { styles } from './styles';
import { colors } from '../../theme';

// Category options matching the mockup
const CATEGORIES = [
  { id: 'trip', imageKey: 'trip' },
  { id: 'food', imageKey: 'food' },
  { id: 'home', imageKey: 'home' },
  { id: 'event', imageKey: 'event' },
  { id: 'rocket', imageKey: 'rocket' }
];

// Image mapping for static require calls
const CATEGORY_IMAGES: { [key: string]: any } = {
  trip: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftrip-icon-black.png?alt=media&token=3afeb768-566f-4fd7-a550-a19c5c4f5caf' },
  food: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffood-icon-black.png?alt=media&token=ef382697-bf78-49e6-b3b3-f669378ebd36' },
  home: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhouse-icon-black.png?alt=media&token=03406723-1c5b-45fd-a20b-dda8c49a2f83' },
  event: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fevent-icon-black.png?alt=media&token=b11d12c2-c4d9-4029-be12-0ddde31ad0d1' },
  rocket: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Frocket-icon-black.png?alt=media&token=90fabb5a-8110-4fd9-9753-9c785fa953a4' },
};

// Color options matching the mockup - all green shades
const COLORS = [
  '#A5EA15', '#4CAF50', '#66BB6A', '#C0F05B', '#D3F48A', '#E4F8B8'
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
        icon: selectedCategory || 'trip',
        color: selectedColor || '#A5EA15',
        created_by: currentUser.id.toString(),
      };

      console.log('🔄 CreateGroupScreen: Creating group with data:', groupData);

      const createdGroup = await createGroup(groupData);

      console.log('🔄 CreateGroupScreen: Group created successfully:', createdGroup.id);

      navigation.navigate('GroupCreated', {
        groupId: createdGroup.id,
        groupName: title.trim(),
        groupIcon: selectedCategory || 'trip',
        groupColor: selectedColor || '#A5EA15'
      });

    } catch (error) {
      console.error('🔄 CreateGroupScreen: Error creating group:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to create group. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
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
        icon: selectedCategory || 'trip',
        color: selectedColor || '#A5EA15',
        created_by: currentUser.id.toString(),
      };

      console.log('🔄 CreateGroupScreen: Creating group for AddMembers with data:', groupData);

      const createdGroup = await createGroup(groupData);

      console.log('🔄 CreateGroupScreen: Group created for AddMembers:', createdGroup.id);

      // Navigate to AddMembers with the created group ID
      navigation.navigate('AddMembers', {
        groupId: createdGroup.id,
        fromCreation: true
      });

    } catch (error) {
      console.error('🔄 CreateGroupScreen: Error creating group for AddMembers:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to create group. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteViaLink = () => {
    // Feature planned for future release
    Alert.alert('Coming Soon', 'Invite via link feature will be available soon!');
  };

  const isFormValid = title.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView>
        {/* Category Section */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryOption,
                selectedCategory === category.id && {
                  backgroundColor: selectedColor,
                  borderWidth: 1,
                  borderColor: colors.green,
                }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Image
                source={CATEGORY_IMAGES[category.imageKey]}
                style={styles.categoryImage}
              />

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
          placeholderTextColor={colors.white50}
          maxLength={50}
        />

        {/* Description */}
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter a description"
          placeholderTextColor={colors.white50}
          multiline
          numberOfLines={3}
          maxLength={200}
        />



        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.membersSectionLabel}>Members</Text>
          {/* Add new members link */}
          <TouchableOpacity style={styles.addMembersLink} onPress={handleAddMembers}>
            <Icon name="user-plus" size={16} color={colors.primaryGreen} style={styles.linkIcon} />
            <Text style={styles.addMembersLinkText}>Add new members</Text>
          </TouchableOpacity>
        </View>

        {/* Current user (You) */}
        <View style={styles.memberItem}>
          <View style={styles.memberAvatar}>
            {currentUser?.avatar ? (
              <Image
                source={{ uri: currentUser.avatar }}
                style={styles.memberAvatarImage}
              />
            ) : (
              <Icon name="user" size={20} color={colors.textLight} />
            )}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {currentUser?.name || 'User'}
            </Text>
            <Text style={styles.memberSubtext}>(You)</Text>
          </View>
        </View>



        {/* Invite via link */}
        <TouchableOpacity style={styles.inviteLink} onPress={handleInviteViaLink}>
          <Icon name="link" size={16} color={colors.green} style={styles.linkIcon} />
          <Text style={styles.inviteLinkText}>Invite via link</Text>
        </TouchableOpacity>
      </ScrollView>



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
    </SafeAreaView>
  );
};

export default CreateGroupScreen; 