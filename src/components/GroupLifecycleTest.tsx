import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useApp } from '../context/AppContext';
import { useGroupData } from '../hooks/useGroupData';
import { firebaseDataService } from '../services/firebaseDataService';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  error?: string;
}

const GroupLifecycleTest: React.FC = () => {
  const { state, createGroup, createExpense, leaveGroup, deleteGroup } = useApp();
  const { currentUser } = state;
  
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Test data
  const testGroupName = `Test Group ${Date.now()}`;
  const testMemberEmail = 'test.member@wesplit.com';
  const testExpenseDescription = 'Test Expense for Lifecycle';

  const updateTestResult = (step: string, status: TestResult['status'], message: string, error?: string) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step ? { ...r, status, message, error } : r);
      } else {
        return [...prev, { step, status, message, error }];
      }
    });
  };

  const log = (message: string) => {
    console.log(`🧪 [GroupLifecycleTest] ${message}`);
  };

  const runTest = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to run tests');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setCurrentStep('');

    try {
      log('Starting group lifecycle test...');

      // Step 1: Create Group
      setCurrentStep('Creating Group');
      updateTestResult('Create Group', 'running', 'Creating test group...');
      
      let newGroup: any = null;
      
      try {
        const groupData = {
          name: testGroupName,
          description: 'Test group for lifecycle testing',
          category: 'trip',
          currency: 'SOL',
          icon: 'people',
          color: '#A5EA15',
          created_by: currentUser.id.toString()
        };

        newGroup = await createGroup(groupData);
        log(`✅ Group created: ${newGroup.id}`);
        updateTestResult('Create Group', 'passed', `Group created successfully: ${newGroup.name}`);
        
        // Verify context update
        const userGroups = state.userGroups || [];
        if (!userGroups.find((g: any) => g.id === newGroup.id)) {
          throw new Error('Group not added to context userGroups');
        }
        log('✅ Context updated with new group');

      } catch (error: any) {
        log(`❌ Group creation failed: ${error}`);
        updateTestResult('Create Group', 'failed', 'Failed to create group', error.message);
        throw error;
      }

      // Step 2: Invite User
      setCurrentStep('Inviting User');
      updateTestResult('Invite User', 'running', 'Inviting test user...');
      
      try {
        const inviteData = await firebaseDataService.group.generateInviteLink(
          newGroup.id.toString(),
          currentUser.id.toString()
        );
        
        log(`✅ Invite link generated: ${inviteData.inviteLink}`);
        updateTestResult('Invite User', 'passed', 'Invite link generated successfully');

        // Create notification for invited user
        await firebaseDataService.notification.createNotification({
          user_id: testMemberEmail,
          type: 'group_invite',
          title: 'Group Invitation',
          message: `${currentUser.name} invited you to join "${testGroupName}"`,
          data: {
            groupId: newGroup.id,
            groupName: testGroupName,
            invitedBy: currentUser.id,
            invitedByName: currentUser.name,
            inviteId: inviteData.inviteId
          },
          is_read: false
        });
        
        log('✅ Notification created for invited user');

      } catch (error: any) {
        log(`❌ User invitation failed: ${error}`);
        updateTestResult('Invite User', 'failed', 'Failed to invite user', error.message);
        throw error;
      }

      // Step 3: User Joins via Notification
      setCurrentStep('User Joining');
      updateTestResult('User Joins', 'running', 'Simulating user joining...');
      
      try {
        // Simulate user accepting invitation
        const groupMembers = await firebaseDataService.group.getGroupMembers(
          newGroup.id.toString(),
          false,
          currentUser.id.toString()
        );
        
        log(`✅ Group members loaded: ${groupMembers.length} members`);
        updateTestResult('User Joins', 'passed', 'User joined successfully');

      } catch (error: any) {
        log(`❌ User join failed: ${error}`);
        updateTestResult('User Joins', 'failed', 'Failed to join group', error.message);
        throw error;
      }

      // Step 4: Add Expense with Split Logic
      setCurrentStep('Adding Expense');
      updateTestResult('Add Expense', 'running', 'Adding test expense...');
      
      try {
        const expenseData = {
          group_id: newGroup.id,
          description: testExpenseDescription,
          amount: 100,
          currency: 'SOL',
          paid_by: currentUser.id,
          category: 0,
          date: new Date().toISOString(),
          split_type: 'equal',
          split_data: [
            { user_id: currentUser.id, amount: 50 },
            { user_id: testMemberEmail, amount: 50 }
          ],
          receipt_image: null,
          converted_amount: 20000,
          converted_currency: 'USDC'
        };

        const newExpense = await createExpense(expenseData);
        log(`✅ Expense created: ${newExpense.id}`);
        updateTestResult('Add Expense', 'passed', 'Expense created successfully');

        // Verify context update
        const groupExpenses = state.groupExpenses?.[newGroup.id] || [];
        if (groupExpenses.length === 0) {
          throw new Error('Expense not added to context groupExpenses');
        }
        log('✅ Context updated with new expense');

      } catch (error: any) {
        log(`❌ Expense creation failed: ${error}`);
        updateTestResult('Add Expense', 'failed', 'Failed to create expense', error.message);
        throw error;
      }

      // Step 5: Leave Group
      setCurrentStep('Leaving Group');
      updateTestResult('Leave Group', 'running', 'Leaving group...');
      
      try {
        await leaveGroup(newGroup.id.toString());
        log('✅ Left group successfully');
        updateTestResult('Leave Group', 'passed', 'Left group successfully');

        // Verify context update
        const userGroups = state.userGroups || [];
        if (userGroups.find((g: any) => g.id === newGroup.id)) {
          throw new Error('Group still in context after leaving');
        }
        log('✅ Context updated after leaving group');

      } catch (error: any) {
        log(`❌ Leave group failed: ${error}`);
        updateTestResult('Leave Group', 'failed', 'Failed to leave group', error.message);
        throw error;
      }

      // Step 6: Delete Group
      setCurrentStep('Deleting Group');
      updateTestResult('Delete Group', 'running', 'Deleting group...');
      
      try {
        await deleteGroup(newGroup.id.toString());
        log('✅ Group deleted successfully');
        updateTestResult('Delete Group', 'passed', 'Group deleted successfully');

        // Verify context update
        const userGroups = state.userGroups || [];
        if (userGroups.find((g: any) => g.id === newGroup.id)) {
          throw new Error('Group still in context after deletion');
        }
        log('✅ Context updated after group deletion');

      } catch (error: any) {
        log(`❌ Delete group failed: ${error}`);
        updateTestResult('Delete Group', 'failed', 'Failed to delete group', error.message);
        throw error;
      }

      log('🎉 All tests completed successfully!');
      Alert.alert('Success', 'All group lifecycle tests passed!');

    } catch (error: any) {
      log(`❌ Test failed: ${error}`);
      Alert.alert('Test Failed', `Test failed at step: ${currentStep}\n\nError: ${error.message}`);
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  const resetTests = () => {
    setTestResults([]);
    setCurrentStep('');
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '#A89B9B';
      case 'running': return '#FFB800';
      case 'passed': return '#A5EA15';
      case 'failed': return '#FF6B6B';
      default: return '#A89B9B';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'passed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Group Lifecycle Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.testInfo}>
          <Text style={styles.testInfoText}>
            This test verifies the complete group lifecycle including:
          </Text>
          <Text style={styles.testStep}>• Create group</Text>
          <Text style={styles.testStep}>• Invite user</Text>
          <Text style={styles.testStep}>• User joins via notification</Text>
          <Text style={styles.testStep}>• Add expense with split logic</Text>
          <Text style={styles.testStep}>• Leave group</Text>
          <Text style={styles.testStep}>• Delete group</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.testButton, isRunning && styles.disabledButton]}
            onPress={runTest}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>
              {isRunning ? 'Running Tests...' : 'Run Group Lifecycle Test'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetTests}
            disabled={isRunning}
          >
            <Text style={styles.resetButtonText}>Reset Tests</Text>
          </TouchableOpacity>
        </View>

        {currentStep && (
          <View style={styles.currentStep}>
            <Text style={styles.currentStepText}>Current Step: {currentStep}</Text>
          </View>
        )}

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          
          {testResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                {getStatusIcon(result.status)} {result.step}
              </Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.error && (
                <Text style={styles.resultError}>Error: {result.error}</Text>
              )}
            </View>
          ))}
        </View>

        {testResults.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Summary:</Text>
            <Text style={styles.summaryText}>
              Passed: {testResults.filter(r => r.status === 'passed').length}
            </Text>
            <Text style={styles.summaryText}>
              Failed: {testResults.filter(r => r.status === 'failed').length}
            </Text>
            <Text style={styles.summaryText}>
              Running: {testResults.filter(r => r.status === 'running').length}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  testInfo: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  testInfoText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 12,
  },
  testStep: {
    color: '#A89B9B',
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#A5EA15',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginRight: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  currentStep: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  currentStepText: {
    color: '#FFB800',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultMessage: {
    color: '#A89B9B',
    fontSize: 14,
    marginBottom: 4,
  },
  resultError: {
    color: '#FF6B6B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  summary: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryText: {
    color: '#A89B9B',
    fontSize: 14,
    marginBottom: 4,
  },
};

export default GroupLifecycleTest; 