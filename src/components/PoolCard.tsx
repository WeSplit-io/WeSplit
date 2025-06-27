import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import { colors } from '../lib/theme';
import Icon from './Icon';

interface PoolCardProps {
  icon: string;
  iconColor: string;
  groupName: string;
  date: string;
  totalCost: string;
  youOwe: string;
  youOwePositive?: boolean;
  avatars: string[];
  moreCount?: number;
  onPress?: () => void;
  onMenuPress?: () => void;
}

const PoolCard: React.FC<PoolCardProps> = ({
  icon,
  iconColor,
  groupName,
  date,
  totalCost,
  youOwe,
  youOwePositive = false,
  avatars,
  moreCount = 0,
  onPress,
  onMenuPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          {/* Placeholder icon */}
          <View style={styles.iconPlaceholder} />
        </View>
        <View style={styles.info}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <View style={styles.menuPlaceholder} />
        </TouchableOpacity>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.totalCostLabel}>Total Cost :</Text>
        <Text style={styles.totalCost}>${totalCost}</Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.youOweLabel}>Total Cost :</Text>
        <Text style={[styles.youOwe, { color: youOwePositive ? '#A6E22E' : '#FFB300' }]}>{youOwe}</Text>
      </View>
      <View style={styles.avatarRow}>
        {avatars.slice(0, 5).map((uri, idx) => (
          <Image key={uri+idx} source={{ uri }} style={styles.avatar} />
        ))}
        {moreCount > 0 && (
          <View style={styles.moreCircle}>
            <Text style={styles.moreText}>+{moreCount}</Text>
          </View>
        )}
        <Text style={styles.moreLabel}>More peoples</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    padding: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: '#BDBDBD',
    borderRadius: 6,
  },
  info: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  menuBtn: {
    padding: 4,
  },
  menuPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  totalCostLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 4,
  },
  totalCost: {
    fontSize: 16,
    color: '#222',
    fontWeight: 'bold',
  },
  youOweLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 4,
  },
  youOwe: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: -8,
    backgroundColor: '#BDBDBD',
  },
  moreCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  moreText: {
    fontSize: 12,
    color: '#222',
    fontWeight: 'bold',
  },
  moreLabel: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
});

export default PoolCard; 