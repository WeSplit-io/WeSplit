import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { joinGroupViaInvite } from '../../services/groupService';
import { styles } from './styles';
import { colors } from '../../theme';

const JoinGroupScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    try {
      setIsJoining(true);
      
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
    } finally {
      setIsJoining(false);
    }
  };

  const handleScanQRCode = () => {
    Alert.alert('QR Scanner', 'QR code scanning feature will be implemented soon');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Group</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="users" size={48} color={colors.primaryGreen} />
        </View>
        
        <Text style={styles.title}>Join an Existing Group</Text>
        <Text style={styles.subtitle}>
          Enter the invite code shared by a group member to join their group
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Enter invite code"
            placeholderTextColor={colors.textPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </View>

        <TouchableOpacity 
          style={styles.scanButton} 
          onPress={handleScanQRCode}
        >
          <Icon name="camera" size={20} color={colors.primaryGreen} />
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.joinButton, isJoining && styles.joinButtonDisabled]} 
          onPress={handleJoinGroup}
          disabled={isJoining || !inviteCode.trim()}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color={colors.textDark} />
          ) : (
            <Text style={styles.joinButtonText}>Join Group</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Icon name="plus" size={20} color={colors.textLight} />
          <Text style={styles.createButtonText}>Create New Group</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default JoinGroupScreen; 