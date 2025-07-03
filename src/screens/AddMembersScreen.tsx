import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, SafeAreaView, ActivityIndicator, Share, Linking } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { getGroupMembers } from '../services/groupService';

const AddMembersScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const groupId = route.params?.groupId;

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId) {
        setError('No group ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get group members
        const groupMembers = await getGroupMembers(groupId);
        setMembers(groupMembers);
        
        // For now, we'll use a simple group object
        setGroup({
          id: groupId,
          name: 'Group',
          member_count: groupMembers.length
        });
        
      } catch (err) {
        console.error('Error fetching group data:', err);
        setError('Failed to load group data');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  const generateInviteLink = () => {
    return `https://wesplit.app/join/${groupId}`;
  };

  const handleShareViaWhatsApp = async () => {
    const inviteLink = generateInviteLink();
    const message = `Join my WeSplit group! Click here to join: ${inviteLink}`;
    
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to general share
        await Share.share({
          message: message,
          url: inviteLink,
        });
  }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Alert.alert('Error', 'Failed to share via WhatsApp');
    }
  };

  const handleShareViaTelegram = async () => {
    const inviteLink = generateInviteLink();
    const message = `Join my WeSplit group! Click here to join: ${inviteLink}`;
    
    try {
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join my WeSplit group!')}`;
      await Linking.openURL(telegramUrl);
    } catch (error) {
      console.error('Error sharing via Telegram:', error);
      Alert.alert('Error', 'Failed to share via Telegram');
    }
  };

  const handleShareLink = async () => {
    const inviteLink = generateInviteLink();
    
    try {
      await Share.share({
        message: `Join my WeSplit group! Click here to join: ${inviteLink}`,
        url: inviteLink,
      });
    } catch (error) {
      console.error('Error sharing link:', error);
      Alert.alert('Error', 'Failed to share link');
    }
  };

  const handleShowQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading group members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Group not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
      {/* Group Info */}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.memberCount}>{members.length} members</Text>
      </View>

      {/* Current Members */}
      <Text style={styles.sectionTitle}>Current Members</Text>
      <View style={styles.membersList}>
          {members.map((member, idx) => (
            <View key={member.id + '-' + idx} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
            </View>
              {member.id.toString() !== currentUser?.id && (
              <TouchableOpacity 
                style={styles.removeButton}
                  onPress={() => Alert.alert('Remove Member', 'This feature will be implemented soon')}
              >
                  <Icon name="x" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            )}
              {member.id.toString() === currentUser?.id && (
              <Text style={styles.youLabel}>You</Text>
            )}
          </View>
        ))}
      </View>

        {/* Invite Options */}
        <Text style={styles.sectionTitle}>Invite New Members</Text>
        
        {/* Share Options */}
        <View style={styles.shareOptions}>
          <TouchableOpacity style={styles.shareOption} onPress={handleShareViaWhatsApp}>
            <Icon name="message-circle" size={24} color="#25D366" />
            <Text style={styles.shareOptionText}>Share via WhatsApp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption} onPress={handleShareViaTelegram}>
            <Icon name="send" size={24} color="#0088CC" />
            <Text style={styles.shareOptionText}>Share via Telegram</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption} onPress={handleShareLink}>
            <Icon name="link" size={24} color="#A5EA15" />
            <Text style={styles.shareOptionText}>Share Link</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption} onPress={handleShowQRCode}>
            <Icon name="smartphone" size={24} color="#A5EA15" />
            <Text style={styles.shareOptionText}>Show QR Code</Text>
        </TouchableOpacity>
      </View>

        {/* QR Code Section */}
        {showQRCode && (
          <View style={styles.qrCodeSection}>
            <Text style={styles.qrCodeTitle}>Scan to Join</Text>
            <View style={styles.qrCodeContainer}>
              <Text style={styles.qrCodePlaceholder}>QR Code will be implemented</Text>
              <Text style={styles.qrCodeText}>{generateInviteLink()}</Text>
            </View>
          </View>
        )}

        {/* Back to Group Button */}
        <TouchableOpacity 
          style={styles.backToGroupButton} 
          onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
        >
          <Icon name="arrow-left" size={20} color="#212121" />
          <Text style={styles.backToGroupButtonText}>Back to Group</Text>
        </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#212121',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#212121',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  groupInfo: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#A89B9B',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 16,
  },
  membersList: {
    marginBottom: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },
  memberEmail: {
    fontSize: 12,
    color: '#A89B9B',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  youLabel: {
    fontSize: 12,
    color: '#A5EA15',
    fontWeight: '500',
  },
  shareOptions: {
    marginBottom: 24,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginLeft: 12,
  },
  qrCodeSection: {
    marginBottom: 24,
  },
  qrCodeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  qrCodePlaceholder: {
    fontSize: 14,
    color: '#A89B9B',
    marginBottom: 12,
  },
  qrCodeText: {
    fontSize: 12,
    color: '#A5EA15',
    textAlign: 'center',
  },
  backToGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  backToGroupButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddMembersScreen; 