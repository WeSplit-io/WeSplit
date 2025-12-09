/**
 * TransactionAmountInput - Reusable amount input for transactions
 * Encapsulates the specialized amount input styling and behavior used in transaction flows
 */

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme';
import PhosphorIcon from './PhosphorIcon';

export interface TransactionAmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  currency?: string;
  showQuickAmounts?: boolean;
  quickAmounts?: number[];
  onQuickAmountPress?: (amount: number) => void;
  selectedQuickAmount?: number | null;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  currencyStyle?: StyleProp<TextStyle>;
}

export const TransactionAmountInput: React.FC<TransactionAmountInputProps> = ({
  value,
  onChangeText,
  placeholder = "0",
  editable = true,
  autoFocus = true,
  maxLength = 12,
  currency = "USDC",
  showQuickAmounts = true,
  quickAmounts = [25, 50, 100], // percentages
  onQuickAmountPress,
  selectedQuickAmount = null,
  containerStyle,
  inputStyle,
  currencyStyle,
}) => {
  return (
    <View style={containerStyle}>
      <View style={{ alignItems: 'center', marginBottom: showQuickAmounts ? 16 : 8 }}>
        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.white70}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          editable={editable}
          textAlign="center"
          selectionColor={colors.green}
          maxLength={maxLength}
          returnKeyType="done"
          blurOnSubmit={true}
        />
        {currency && (
          <Text style={currencyStyle}>
            {currency}
          </Text>
        )}
      </View>

      {/* Quick Amount Chips */}
      {showQuickAmounts && quickAmounts.length > 0 && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 12,
          marginTop: 8
        }}>
          {quickAmounts.map((percentage) => (
            <TouchableOpacity
              key={percentage}
              style={[
                {
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.white30,
                  backgroundColor: colors.cardBackground,
                },
                selectedQuickAmount === percentage && {
                  backgroundColor: colors.green,
                  borderColor: colors.green,
                }
              ]}
              onPress={() => onQuickAmountPress?.(percentage)}
              disabled={!editable}
            >
              <Text style={[
                {
                  fontSize: 14,
                  color: colors.white70,
                  fontWeight: '500',
                },
                selectedQuickAmount === percentage && {
                  color: colors.black,
                  fontWeight: '600',
                }
              ]}>
                {percentage}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};
