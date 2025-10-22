import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native'; 
import Icon from '../../components/Icon';
import { useTranslation, i18nService, SupportedLanguage } from '../../services/i18nService';
import { Container, Header } from '../../components/shared';
import styles from './styles';

interface LanguageScreenProps {
  navigation: any;
}

const LanguageScreen: React.FC<LanguageScreenProps> = ({ navigation }) => {
  const { t, language, setLanguage, availableLanguages } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const handleLanguageSelect = async (languageCode: SupportedLanguage) => {
    if (languageCode === selectedLanguage) {return;}

    try {
      setLoading(true);
      setSelectedLanguage(languageCode);
      
      // Set the language using the i18n service
      await setLanguage(languageCode);
      
      // Show success message
      Alert.alert(
        t('common.success'),
        t('settings.language') + ' updated successfully',
        [{ text: t('common.ok'), style: 'default' }]
      );
    } catch (error) {
      console.error('Error setting language:', error);
      Alert.alert(
        t('common.error'),
        'Failed to update language. Please try again.',
        [{ text: t('common.ok'), style: 'default' }]
      );
      // Revert selection on error
      setSelectedLanguage(language);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (selectedLanguage !== language) {
      handleLanguageSelect(selectedLanguage);
    } else {
      navigation.goBack();
    }
  };

  return (
    <Container>
      <Header
        title={t('settings.language')}
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            {loading ? (
              <ActivityIndicator size="small" color="#A5EA15" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.descriptionSection}>
          <Text style={styles.description}>
            Select your preferred language. The app will restart to apply the changes.
          </Text>
        </View>

        <View style={styles.languagesSection}>
          <Text style={styles.sectionTitle}>Available Languages</Text>
          
          {availableLanguages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageItem,
                selectedLanguage === lang.code && styles.selectedLanguageItem
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              disabled={loading}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <View style={styles.languageText}>
                  <Text style={styles.languageName}>{lang.name}</Text>
                  <Text style={styles.languageNativeName}>{lang.nativeName}</Text>
                </View>
              </View>
              
              <View style={styles.languageAction}>
                {selectedLanguage === lang.code ? (
                  <View style={styles.selectedIndicator}>
                    <Icon name="check-circle" size={24} color="#A5EA15" />
                  </View>
                ) : (
                  <View style={styles.unselectedIndicator} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.currentLanguageSection}>
          <Text style={styles.sectionTitle}>Current Language</Text>
          <View style={styles.currentLanguageCard}>
            <Text style={styles.currentLanguageLabel}>Active Language:</Text>
            <Text style={styles.currentLanguageValue}>
              {availableLanguages.find(l => l.code === language)?.name || 'English'}
            </Text>
          </View>
        </View>

        <View style={styles.helpSection}>
          <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
            <Text style={styles.helpTitle}>Need Help?</Text>
          </TouchableOpacity>
          <Text style={styles.helpText}>
            If you don't see your language listed, please contact our support team. 
            We're constantly working to add more language options.
          </Text>
          
          <TouchableOpacity style={styles.helpButton}>
            <Icon name="mail" size={20} color="#A5EA15" />
            <Text style={styles.helpButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Icon name="info" size={20} color="#A5EA15" />
            <Text style={styles.infoText}>
              Language changes will be applied immediately. Some text may require an app restart to fully update.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};

export default LanguageScreen; 