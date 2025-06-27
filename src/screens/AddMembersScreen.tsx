import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const AddMembersScreen: React.FC<any> = ({ navigation, route }) => {
  const { state, getGroupById, dispatch } = useApp();
  const { currentUser } = state;
  const groupId = route.params?.groupId;

  const group = getGroupById(groupId);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Members</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="alert-circle" size={64} color={colors.gray} />
          <Text style={styles.emptyStateText}>Group not found</Text>
          <Text style={styles.emptyStateSubtext}>The group you're looking for doesn't exist</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton} 
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.emptyStateButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleAddMember = () => {
    if (!newMemberEmail.trim() || !newMemberName.trim()) {
      Alert.alert('Error', 'Please enter both name and email');
      return;
    }

    // Actually add the member to the group in context
    const newMember = {
      id: Date.now().toString(),
      name: newMemberName,
      email: newMemberEmail,
      avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
      walletAddress: '',
    };
    const updatedGroup = {
      ...group,
      members: [...group.members, newMember],
    };
    dispatch({ type: 'UPDATE_GROUP', payload: updatedGroup });
    setNewMemberEmail('');
    setNewMemberName('');
    Alert.alert(
      'Member Added',
      `${newMemberName} has been added to ${group.name}`,
      [
        { text: 'Add Another' },
        { text: 'Done', onPress: () => navigation.navigate('GroupDetails', { groupId: group.id }) }
      ]
    );
  };

  const handleRemoveMember = (memberId: string) => {
    if (memberId === currentUser?.id) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself from the group');
      return;
    }
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          // Actually remove the member from the group in context
          const updatedGroup = {
            ...group,
            members: group.members.filter(m => m.id !== memberId),
          };
          dispatch({ type: 'UPDATE_GROUP', payload: updatedGroup });
          Alert.alert('Member Removed', 'Member has been removed from the group');
        }}
      ]
    );
  };

  const handleBackToGroup = () => {
    navigation.navigate('GroupDetails', { groupId: group.id });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.name} - Members</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Group Info */}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.memberCount}>{group.members.length} members</Text>
      </View>

      {/* Current Members */}
      <Text style={styles.sectionTitle}>Current Members</Text>
      <View style={styles.membersList}>
        {group.members.map((member, idx) => (
          <View key={member.id + idx} style={styles.memberRow}>
            <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
            </View>
            {member.id !== currentUser?.id && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => handleRemoveMember(member.id)}
              >
                <Icon name="x" size={16} color={colors.red} />
              </TouchableOpacity>
            )}
            {member.id === currentUser?.id && (
              <Text style={styles.youLabel}>You</Text>
            )}
          </View>
        ))}
      </View>

      {/* Add New Member */}
      <Text style={styles.sectionTitle}>Add New Member</Text>
      <View style={styles.addMemberForm}>
        <TextInput
          style={styles.input}
          value={newMemberName}
          onChangeText={setNewMemberName}
          placeholder="Member name"
          placeholderTextColor={colors.gray}
        />
        <TextInput
          style={styles.input}
          value={newMemberEmail}
          onChangeText={setNewMemberEmail}
          placeholder="Member email"
          placeholderTextColor={colors.gray}
          keyboardType="email-address"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddMember}>
          <Text style={styles.addButtonText}>Add Member</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.backToGroupButton} onPress={handleBackToGroup}>
          <Icon name="arrow-left" size={20} color={colors.background} />
          <Text style={styles.backToGroupButtonText}>Back to Group</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backToDashboardButton} 
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="home" size={20} color={colors.background} />
          <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
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
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  groupInfo: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  groupName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  memberCount: {
    fontSize: fontSizes.md,
    color: colors.gray,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  membersList: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium as any,
    color: colors.text,
  },
  memberEmail: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    marginTop: 2,
  },
  removeButton: {
    padding: spacing.sm,
  },
  youLabel: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium as any,
  },
  addMemberForm: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.secondary,
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    padding: spacing.md,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: colors.background,
  },
  navigationButtons: {
    gap: spacing.md,
  },
  backToGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    padding: spacing.md,
  },
  backToGroupButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    marginLeft: spacing.sm,
  },
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray,
    borderRadius: radii.input,
    padding: spacing.md,
  },
  backToDashboardButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    marginLeft: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
  },
});

export default AddMembersScreen; 