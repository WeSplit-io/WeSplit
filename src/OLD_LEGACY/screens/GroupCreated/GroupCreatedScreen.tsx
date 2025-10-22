import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { styles } from './styles';

const GroupCreatedScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId, groupName, groupIcon, groupColor } = route.params;

  const handleViewGroup = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: 'Dashboard' },
        { name: 'GroupDetails', params: { groupId } }
      ],
    });
  };

  const handleGoToDashboard = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Dashboard' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Success Header */}
      <View style={styles.successSection}>
        <View style={styles.checkmarkContainer}>
          <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsuccess-icon.png?alt=media&token=6cf1d0fb-7a48-4c4c-aa4c-3c3f76c54f07' }} style={styles.checkmarkIcon} />
        </View>
        <Text style={styles.successTitle}>Group Created Successfully!</Text>
        <Text style={styles.successSubtitle}>Your group is ready to use</Text>
      </View>

      {/* Group Preview */}
     {/*} <View style={styles.groupPreview}>
        <View style={[styles.groupIcon, { backgroundColor: groupColor }]}>
          <Icon name={groupIcon} size={24} color="#212121" />
        </View>
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.groupDescription}>
          Start adding expenses and splitting costs with your group members
        </Text>
      </View>*/}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleViewGroup}>
          <Text style={styles.primaryButtonText}>View Group</Text>
        </TouchableOpacity>
        
        {/*<TouchableOpacity style={styles.secondaryButton} onPress={handleGoToDashboard}>
          <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>*/}
      </View>
    </SafeAreaView>
  );
};

export default GroupCreatedScreen; 