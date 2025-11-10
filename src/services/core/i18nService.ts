/**
 * Internationalization Service
 * Handles translations and language management
 */

import { logger } from '../analytics/loggingService';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko';

export interface TranslationData {
  [key: string]: string | TranslationData;
}

class I18nService {
  private static instance: I18nService;
  private currentLanguage: SupportedLanguage = 'en';
  private translations: Map<SupportedLanguage, TranslationData> = new Map();

  private constructor() {
    this.initializeTranslations();
  }

  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  private initializeTranslations(): void {
    // Mock translations
    this.translations.set('en', {
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.confirm': 'Confirm',
      'common.error': 'Error',
      'common.success': 'Success',
      'wallet.balance': 'Balance',
      'wallet.send': 'Send',
      'wallet.receive': 'Receive'
    });

    this.translations.set('es', {
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.delete': 'Eliminar',
      'common.confirm': 'Confirmar',
      'common.error': 'Error',
      'common.success': 'Éxito',
      'wallet.balance': 'Saldo',
      'wallet.send': 'Enviar',
      'wallet.receive': 'Recibir'
    });
  }

  public translate(key: string, params?: Record<string, string>): string {
    const translation = this.getTranslation(key);
    if (!translation) {
      logger.warn('Translation not found', { key, language: this.currentLanguage }, 'I18nService');
      return key;
    }

    if (params) {
      return this.interpolate(translation, params);
    }

    return translation;
  }

  private getTranslation(key: string): string | null {
    const keys = key.split('.');
    let current: TranslationData | undefined = this.translations.get(this.currentLanguage);

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k] as TranslationData | string;
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  private interpolate(text: string, params: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] || match;
    });
  }

  public setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    logger.info('Language changed', { language }, 'I18nService');
  }

  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.translations.keys());
  }

  // Get language metadata for UI display
  public getLanguageMetadata(): Array<{ code: SupportedLanguage; name: string; nativeName: string; flag: string }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' }
    ];
  }
}

export const i18nService = I18nService.getInstance();
export const useTranslation = () => ({
  t: i18nService.translate.bind(i18nService),
  setLanguage: i18nService.setLanguage.bind(i18nService),
  currentLanguage: i18nService.getCurrentLanguage(),
  language: i18nService.getCurrentLanguage(), // Alias for currentLanguage
  availableLanguages: i18nService.getLanguageMetadata() // Return language metadata with code, name, nativeName, flag
});

export const translate = i18nService.translate.bind(i18nService);
export const getCurrentLanguage = i18nService.getCurrentLanguage.bind(i18nService);
export const setLanguage = i18nService.setLanguage.bind(i18nService);

export default i18nService;