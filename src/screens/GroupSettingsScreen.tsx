import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const GroupSettingsScreen: React.FC<any> = ({ navigation, route }) => {
  const { getGroupById, getGroupBalances } = useApp();
  const groupId = route.params?.groupId;
  const group = getGroupById(groupId);
  const balances = group ? getGroupBalances(group.id) : [];

  // Deep logging for debugging
  console.log('Group:', group);
  console.log('Balances:', balances);
  if (group) {
    group.members.forEach((m, idx) => {
      const bal = balances.find(b => b.userId === m.id);
      console.log(`Member ${idx}:`, m, 'Balance:', bal);
    });
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.groupName}>Group not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: group.category === 'travel' ? '#A5A6F622' : '#FF6B6B22' }]}> {/* 22 for light tint */}
          <Icon name={group.category === 'travel' ? 'map-pin' : 'users'} color={group.category === 'travel' ? '#A5A6F6' : '#FF6B6B'} size={28} />
        </View>
        <Text style={styles.groupName}>{String(group.name)}</Text>
      </View>
      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('AddMembers', { groupId: group.id })}>
        <Icon name="user-plus" size={20} color={colors.primary} />
        <Text style={styles.linkText}>Add new members</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow}>
        <Icon name="link" size={20} color={colors.primary} />
        <Text style={styles.linkText}>Invite via link</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>{String(group.members.length)} Members</Text>
      {group.members.map((m, idx) => {
        const bal = balances.find(b => b.userId === m.id);
        return (
          <React.Fragment key={m.id + idx}>
            <View style={styles.memberRow}>
              <Image source={{ uri: m.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{String(m.name)}</Text>
                <Text style={styles.memberEmail}>{String(m.email)}</Text>
              </View>
              <Text style={[styles.memberBalance, { color: bal && bal.status === 'gets back' ? colors.green : bal && bal.status === 'owes' ? colors.red : colors.gray }]}> 
                {bal
                  ? `${bal.status === 'gets back' ? 'gets back ' : bal.status === 'owes' ? 'owes ' : ''}${typeof bal.amount === 'number' ? bal.amount.toFixed(2) : ''}`
                  : ''}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
      {/* Defensive fallback to prevent stray arrays/objects in JSX */}
      {false && <Text>{JSON.stringify(group)}</Text>}
      <TouchableOpacity style={styles.leaveBtn}>
        <Text style={styles.leaveBtnText}>Leave Group</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>Delete Group</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  groupName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: 2,
  },
  linkText: {
    color: colors.primary,
    fontWeight: fontWeights.medium as any,
    fontSize: fontSizes.md,
    marginLeft: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    fontWeight: fontWeights.medium as any,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.md,
    backgroundColor: colors.lightGray,
  },
  memberName: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.medium as any,
  },
  memberEmail: {
    fontSize: fontSizes.xs,
    color: colors.gray,
  },
  memberBalance: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold as any,
    marginLeft: spacing.md,
  },
  leaveBtn: {
    backgroundColor: colors.card,
    borderRadius: radii.button,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  leaveBtnText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold as any,
  },
  deleteBtn: {
    backgroundColor: colors.red,
    borderRadius: radii.button,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  deleteBtnText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold as any,
  },
});

export default GroupSettingsScreen; 