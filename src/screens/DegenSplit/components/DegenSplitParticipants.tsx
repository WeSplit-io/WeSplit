/**
 * Degen Split Participants Component
 * Shows participant list with lock status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import Avatar from '../../../components/shared/Avatar';
import { roundUsdcAmount, formatUsdcForDisplay } from '../../../utils/ui/format/formatUtils';
import { styles } from './DegenSplitParticipantsStyles';
import { 
  getParticipantStatusDisplayText, 
  getParticipantStatusColor 
} from '../../../utils/statusUtils';
import UserNameWithBadges from '../../../components/profile/UserNameWithBadges';
import { firebaseDataService } from '../../../services/data/firebaseDataService';

interface Participant {
  id: string;
  userId: string;
  name: string;
  walletAddress?: string;
  amountPaid?: number;
  status?: string;
  avatar?: string; // Add avatar property
}

interface DegenSplitParticipantsProps {
  participants: Participant[];
  totalAmount: number;
  currentUserId?: string;
  splitWallet?: any;
}

const DegenSplitParticipants: React.FC<DegenSplitParticipantsProps> = ({
  participants,
  totalAmount,
  currentUserId,
  splitWallet,
}) => {
  const [participantBadges, setParticipantBadges] = useState<Record<string, { badges: string[]; active_badge?: string }>>({});
  const [participantsWithWalletAddresses, setParticipantsWithWalletAddresses] = useState<Participant[]>(participants);

  // Fetch badges and wallet addresses for all participants
  useEffect(() => {
    const fetchParticipantData = async () => {
      const badgesMap: Record<string, { badges: string[]; active_badge?: string }> = {};
      const updatedParticipants: Participant[] = [];
      
      await Promise.all(
        participants.map(async (participant) => {
          try {
            const userId = participant.userId || participant.id;
            if (!userId) {
              updatedParticipants.push(participant);
              return;
            }
            
            // Check if wallet address is missing and try to fetch it
            let walletAddress = participant.walletAddress || participant.wallet_address || '';
            
            // If wallet address is missing, try to get it from splitWallet first
            if (!walletAddress && splitWallet?.participants) {
              const walletParticipant = splitWallet.participants.find(
                (p: any) => p.userId === userId
              );
              walletAddress = walletParticipant?.walletAddress || '';
            }
            
            // If still missing, fetch from Firebase
            if (!walletAddress) {
              try {
                const userData = await firebaseDataService.user.getCurrentUser(userId);
                walletAddress = userData?.wallet_address || userData?.walletAddress || '';
                
                // Also fetch badges
                if (userData.badges && userData.badges.length > 0) {
                  badgesMap[userId] = {
                    badges: userData.badges,
                    active_badge: userData.active_badge
                  };
                }
              } catch (error) {
                // Silently fail - wallet address and badges are optional
              }
            } else {
              // Wallet address exists, just fetch badges
              try {
                const userData = await firebaseDataService.user.getCurrentUser(userId);
                if (userData.badges && userData.badges.length > 0) {
                  badgesMap[userId] = {
                    badges: userData.badges,
                    active_badge: userData.active_badge
                  };
                }
              } catch (error) {
                // Silently fail - badges are optional
              }
            }
            
            updatedParticipants.push({
              ...participant,
              walletAddress: walletAddress || participant.walletAddress || participant.wallet_address || '',
            });
          } catch (error) {
            // If fetch fails, use original participant data
            updatedParticipants.push(participant);
          }
        })
      );
      
      setParticipantBadges(badgesMap);
      setParticipantsWithWalletAddresses(updatedParticipants);
    };

    if (participants.length > 0) {
      fetchParticipantData();
    } else {
      setParticipantsWithWalletAddresses(participants);
    }
  }, [participants, splitWallet?.participants]);

  return (
    <View style={styles.participantsContainer}>
      <ScrollView 
        style={styles.participantsScrollView}
        showsVerticalScrollIndicator={false}
      >
        
        {participantsWithWalletAddresses.map((participant, index) => {
          const userId = participant.userId || participant.id;
          const badges = userId ? participantBadges[userId] : undefined;
          // Use wallet participant data if available for accurate lock status and wallet address
          const walletParticipant = splitWallet?.participants?.find(
            (p: any) => p.userId === (participant.userId || participant.id)
          );
          const isParticipantLocked = walletParticipant ? 
            walletParticipant.status === 'locked' || walletParticipant.amountPaid >= walletParticipant.amountOwed : 
            false;
          
          // CRITICAL FIX: Get wallet address from walletParticipant first (most reliable source),
          // then fall back to participant prop, then try to fetch from Firebase
          const walletAddress = walletParticipant?.walletAddress || 
                                participant.walletAddress || 
                                participant.wallet_address || 
                                '';
          
          // Check if this is the current user
          const isCurrentUser = currentUserId && (participant.userId || participant.id) === currentUserId;
          
          return (
            <View 
              key={participant.userId || participant.id || `participant_${index}`} 
              style={styles.participantCard}
            >
              <Avatar
                userId={participant.userId || participant.id}
                userName={participant.name || `Participant ${index + 1}`}
                size={40}
                avatarUrl={participant.avatar || walletParticipant?.avatar}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.white10,
                }}
              />
              
              <View style={styles.participantInfo}>
                <UserNameWithBadges
                  userId={participant.userId || participant.id}
                  userName={`${participant.name || walletParticipant?.name || `Participant ${index + 1}`}${isCurrentUser ? ' (You)' : ''}`}
                  textStyle={styles.participantName}
                  showBadges={false}
                />
                <Text style={styles.participantWallet}>
                  {walletAddress && walletAddress.length > 8 ? 
                    `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 
                    walletAddress || 'No wallet address'
                  }
                </Text>
              </View>
              
              <View style={styles.participantAmountContainer}>
                <Text style={styles.participantAmount}>{formatUsdcForDisplay(totalAmount)} USDC</Text>
                {isParticipantLocked ? (
                  <View style={styles.lockedIndicator}>
                    <Text style={styles.lockedIndicatorText}>
                      🔒 {getParticipantStatusDisplayText('locked')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.unlockedIndicator}>
                    <Text style={styles.unlockedIndicatorText}>
                      ⏳ {getParticipantStatusDisplayText('pending')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default DegenSplitParticipants;
