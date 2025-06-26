import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useWallet } from '../context/WalletContext';

interface Pool {
  id: string;
  name: string;
  totalExpenses: number;
  yourBalance: number;
  memberCount: number;
  lastActivity: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  poolName: string;
  type: 'expense' | 'settlement';
}

const DashboardScreen: React.FC = ({ navigation }: any) => {
  const { isConnected, address, connectWallet, disconnectWallet, isLoading, chainId } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('DashboardScreen mounted successfully');
    loadPools();
  }, []);

  useEffect(() => {
    console.log('Wallet state changed:', { isConnected, address, chainId });
  }, [isConnected, address, chainId]);

  const loadPools = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with real API call
      const mockPools: Pool[] = [
        {
          id: '1',
          name: 'Vacation Trip',
          totalExpenses: 2500,
          yourBalance: -150,
          memberCount: 4,
          lastActivity: '2 hours ago',
        },
        {
          id: '2',
          name: 'Dinner Group',
          totalExpenses: 320,
          yourBalance: 45,
          memberCount: 6,
          lastActivity: '1 day ago',
        },
        {
          id: '3',
          name: 'Rent & Utilities',
          totalExpenses: 1800,
          yourBalance: 0,
          memberCount: 3,
          lastActivity: '3 days ago',
        },
      ];
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      setPools(mockPools);
    } catch (error) {
      console.error('Error loading pools:', error);
      Alert.alert('Error', 'Failed to load pools');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleCreatePool = () => {
    navigation.navigate('CreatePool');
  };

  const handleViewPool = (poolId: string) => {
    navigation.navigate('ViewPool', { poolId });
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    const color = balance >= 0 ? '#4CAF50' : '#F44336';
    const sign = balance >= 0 ? '+' : '';
    return { text: `${sign}$${balance.toFixed(2)}`, color };
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return '#28a745';
    if (balance < 0) return '#dc3545';
    return '#6c757d';
  };

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `+${formatBalance(balance).text}`;
    if (balance < 0) return `-${formatBalance(balance).text}`;
    return formatBalance(balance).text;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your pools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>WeSplit</Text>
        <View style={styles.walletSection}>
          {isConnected && address ? (
            <View style={styles.connectedWallet}>
              <Text style={styles.walletAddress}>{formatAddress(address)}</Text>
              <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={handleDisconnectWallet}
                disabled={isLoading}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={handleConnectWallet}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.connectButtonText}>Connect Wallet</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Network Info */}
      {chainId && (
        <View style={styles.networkInfo}>
          <Text style={styles.networkText}>Network: {chainId}</Text>
        </View>
      )}

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pools.length}</Text>
          <Text style={styles.statLabel}>Active Pools</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            ${pools.reduce((sum, pool) => sum + pool.totalExpenses, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Total Expenses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            ${pools.reduce((sum, pool) => sum + pool.yourBalance, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Your Balance</Text>
        </View>
      </View>

      {/* Pools Section */}
      <View style={styles.poolsSection}>
        <View style={styles.poolsHeader}>
          <Text style={styles.poolsTitle}>Your Pools</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreatePool}>
            <Text style={styles.createButtonText}>+ New Pool</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.poolsList} showsVerticalScrollIndicator={false}>
          {pools.map((pool) => {
            const balanceInfo = formatBalance(pool.yourBalance);
            return (
              <TouchableOpacity
                key={pool.id}
                style={styles.poolCard}
                onPress={() => handleViewPool(pool.id)}
              >
                <View style={styles.poolHeader}>
                  <Text style={styles.poolName}>{pool.name}</Text>
                  <Text style={[styles.poolBalance, { color: balanceInfo.color }]}>
                    {balanceInfo.text}
                  </Text>
                </View>
                <View style={styles.poolDetails}>
                  <Text style={styles.poolDetail}>
                    Total: ${pool.totalExpenses.toFixed(2)}
                  </Text>
                  <Text style={styles.poolDetail}>
                    Members: {pool.memberCount}
                  </Text>
                  <Text style={styles.poolDetail}>
                    Last activity: {pool.lastActivity}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  walletSection: {
    alignItems: 'flex-end',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  connectedWallet: {
    alignItems: 'center',
  },
  walletAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  disconnectButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  networkInfo: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  networkText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  poolsSection: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  poolsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  poolsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  poolsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  poolCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  poolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  poolBalance: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  poolDetails: {
    gap: 4,
  },
  poolDetail: {
    fontSize: 14,
    color: '#666',
  },
});

export default DashboardScreen; 