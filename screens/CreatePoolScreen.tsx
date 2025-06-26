import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { PoolUtils, Pool } from '../utils/poolUtils';
import { useWallet } from '../context/WalletContext';

const CreatePoolScreen = ({ navigation }: any) => {
  const [poolName, setPoolName] = useState('');
  const [memberAddresses, setMemberAddresses] = useState<string[]>(['']);
  const { address } = useWallet();

  const addMember = () => {
    setMemberAddresses([...memberAddresses, '']);
  };

  const removeMember = (index: number) => {
    if (memberAddresses.length > 1) {
      const newMembers = memberAddresses.filter((_, i) => i !== index);
      setMemberAddresses(newMembers);
    }
  };

  const updateMemberAddress = (index: number, address: string) => {
    const newMembers = [...memberAddresses];
    newMembers[index] = address;
    setMemberAddresses(newMembers);
  };

  const handleCreatePool = () => {
    if (!poolName.trim()) {
      Alert.alert('Error', 'Please enter a pool name');
      return;
    }

    if (!address) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    // Filter out empty addresses and add creator if not already included
    const validAddresses = memberAddresses
      .filter(addr => addr.trim() !== '')
      .map(addr => addr.trim());

    if (!validAddresses.includes(address)) {
      validAddresses.push(address);
    }

    if (validAddresses.length < 2) {
      Alert.alert('Error', 'Pool must have at least 2 members');
      return;
    }

    // Create the pool
    const pool = PoolUtils.createPool(poolName, validAddresses, address);
    
    // TODO: Save pool to storage/database
    console.log('Created pool:', pool);
    
    Alert.alert(
      'Success',
      'Pool created successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ViewPool', { poolId: pool.id }),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Expense Pool</Text>
        <Text style={styles.subtitle}>Set up a new expense sharing group</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pool Name</Text>
          <TextInput
            style={styles.input}
            value={poolName}
            onChangeText={setPoolName}
            placeholder="Enter pool name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Members</Text>
          {memberAddresses.map((address, index) => (
            <View key={index} style={styles.memberRow}>
              <TextInput
                style={[styles.input, styles.memberInput]}
                value={address}
                onChangeText={(text) => updateMemberAddress(index, text)}
                placeholder="Enter member wallet address"
                placeholderTextColor="#999"
              />
              {memberAddresses.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMember(index)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          <TouchableOpacity style={styles.addButton} onPress={addMember}>
            <Text style={styles.addButtonText}>+ Add Member</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreatePool}>
          <Text style={styles.createButtonText}>Create Pool</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: '#ff4444',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreatePoolScreen; 