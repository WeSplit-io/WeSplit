import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { colors, spacing, typography } from '../../theme';
import { styles } from './styles';

const PIN_LENGTH = 6;

const CreatePinScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<{ params?: { fromPinUnlock?: boolean } }>();
  const [pin, setPin] = useState<string[]>([]);

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = [...pin, number];
      setPin(newPin);
      
      // Navigate to VerifyPin when PIN is complete
      if (newPin.length === PIN_LENGTH) {
        setTimeout(() => {
          (navigation as any).navigate('VerifyPin', {
            pin: newPin.join(''),
            fromPinUnlock: route.params?.fromPinUnlock,
          });
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <Container>
      <View style={styles.container}>
        <Header
          showBackButton={false}
          showHelpCenter={true}
          onHelpCenterPress={handleHelpCenterPress}
        />

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>Create your PIN</Text>

          {/* PIN Indicators */}
          <View style={styles.pinIndicators}>
            {Array.from({ length: PIN_LENGTH }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  pin[index] ? styles.pinDotFilled : styles.pinDotEmpty,
                ]}
              />
            ))}
          </View>

          {/* Numeric Keypad */}
          <View style={styles.keypad}>
            {/* Row 1: 1, 2, 3 */}
            <View style={styles.keypadRow}>
              {['1', '2', '3'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(num)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 2: 4, 5, 6 */}
            <View style={styles.keypadRow}>
              {['4', '5', '6'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(num)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 3: 7, 8, 9 */}
            <View style={styles.keypadRow}>
              {['7', '8', '9'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(num)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 4: empty, 0, backspace */}
            <View style={styles.keypadRow}>
              <View style={styles.keypadButtonEmpty} />
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={() => handleNumberPress('0')}
                activeOpacity={0.7}
              >
                <Text style={styles.keypadButtonText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keypadButtonDelete}
                onPress={handleBackspace}
                activeOpacity={0.7}
                disabled={pin.length === 0}
              >
                <Image
                  source={{
                    uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FDelete.png?alt=media&token=4cb8e3f2-c9e4-473c-a87b-412c9cd577a4',
                  }}
                  style={[
                    styles.deleteIcon,
                    pin.length === 0 && styles.deleteIconDisabled,
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Container>
  );
};

export default CreatePinScreen;
