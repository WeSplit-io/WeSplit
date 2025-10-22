import AsyncStorage from '@react-native-async-storage/async-storage';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
};

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Translation keys structure
export interface TranslationKeys {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    done: string;
    back: string;
    next: string;
    previous: string;
    confirm: string;
    yes: string;
    no: string;
    ok: string;
    error: string;
    success: string;
    loading: string;
    retry: string;
    close: string;
    search: string;
    filter: string;
    clear: string;
    select: string;
  };
  
  // Navigation
  navigation: {
    dashboard: string;
    groups: string;
    balance: string;
    profile: string;
    settings: string;
    premium: string;
    notifications: string;
  };
  
  // Authentication
  auth: {
    welcome: string;
    getStarted: string;
    signIn: string;
    signUp: string;
    logout: string;
    createAccount: string;
    forgotPassword: string;
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    verificationCode: string;
    enterCode: string;
    resendCode: string;
    loginSuccess: string;
    loginError: string;
    emailRequired: string;
    passwordRequired: string;
    invalidEmail: string;
    weakPassword: string;
    passwordMismatch: string;
  };
  
  // Groups
  groups: {
    title: string;
    createGroup: string;
    joinGroup: string;
    groupName: string;
    description: string;
    members: string;
    expenses: string;
    balances: string;
    settings: string;
    leaveGroup: string;
    deleteGroup: string;
    inviteCode: string;
    shareCode: string;
    noGroups: string;
    groupCreated: string;
    groupJoined: string;
    groupLeft: string;
    groupDeleted: string;
    inviteMembers: string;
    groupDetails: string;
    totalExpenses: string;
    yourBalance: string;
    groupBalance: string;
  };
  
  // Expenses
  expenses: {
    title: string;
    addExpense: string;
    editExpense: string;
    deleteExpense: string;
    amount: string;
    description: string;
    category: string;
    paidBy: string;
    splitBetween: string;
    date: string;
    receipt: string;
    noExpenses: string;
    expenseAdded: string;
    expenseUpdated: string;
    expenseDeleted: string;
    invalidAmount: string;
    descriptionRequired: string;
    categoryRequired: string;
    splitEvenly: string;
    splitUnequally: string;
    splitByShares: string;
    splitByPercentage: string;
    totalAmount: string;
    remainingAmount: string;
    splitDetails: string;
  };
  
  // Balance
  balance: {
    title: string;
    youOwe: string;
    owesYou: string;
    settleUp: string;
    sendReminder: string;
    markAsPaid: string;
    noBalance: string;
    balanceSettled: string;
    reminderSent: string;
    overallBalance: string;
    groupBalances: string;
    individualBalances: string;
    settleAll: string;
  };
  
  // Wallet
  wallet: {
    title: string;
    connect: string;
    disconnect: string;
    balance: string;
    address: string;
    transactions: string;
    send: string;
    receive: string;
    deposit: string;
    withdraw: string;
    notConnected: string;
    connecting: string;
    connected: string;
    connectionFailed: string;
    invalidAddress: string;
    insufficientFunds: string;
    transactionSent: string;
    transactionFailed: string;
    copyAddress: string;
    addressCopied: string;
  };
  
  // Premium
  premium: {
    title: string;
    features: string;
    subscribe: string;
    cancel: string;
    restore: string;
    monthly: string;
    yearly: string;
    price: string;
    savings: string;
    mostPopular: string;
    paymentMethod: string;
    subscribeNow: string;
    subscriptionActive: string;
    subscriptionCancelled: string;
    paymentSuccessful: string;
    paymentFailed: string;
    comingSoon: string;
    unlockFeatures: string;
    advancedAnalytics: string;
    unlimitedGroups: string;
    enhancedSecurity: string;
    exportReports: string;
    prioritySupport: string;
    fasterTransactions: string;
  };
  
  // Settings
  settings: {
    title: string;
    profile: string;
    account: string;
    notifications: string;
    language: string;
    currency: string;
    privacy: string;
    security: string;
    about: string;
    help: string;
    feedback: string;
    rateApp: string;
    shareApp: string;
    version: string;
    termsOfService: string;
    privacyPolicy: string;
    contactSupport: string;
    darkMode: string;
    pushNotifications: string;
    emailNotifications: string;
    soundEnabled: string;
    vibrationEnabled: string;
  };
  
  // Notifications
  notifications: {
    title: string;
    markAllRead: string;
    clearAll: string;
    noNotifications: string;
    newExpense: string;
    paymentRequest: string;
    balanceUpdate: string;
    groupInvite: string;
    reminderSent: string;
    notificationSettings: string;
    enableNotifications: string;
    disableNotifications: string;
  };
  
  // Errors
  errors: {
    generic: string;
    network: string;
    timeout: string;
    unauthorized: string;
    forbidden: string;
    notFound: string;
    serverError: string;
    validationError: string;
    unknownError: string;
    tryAgain: string;
    contactSupport: string;
  };
  
  // Success messages
  success: {
    saved: string;
    updated: string;
    deleted: string;
    sent: string;
    received: string;
    completed: string;
    confirmed: string;
  };
}

// English translations (default)
const englishTranslations: TranslationKeys = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    done: 'Done',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    error: 'Error',
    success: 'Success',
    loading: 'Loading...',
    retry: 'Retry',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    select: 'Select',
  },
  navigation: {
    dashboard: 'Dashboard',
    groups: 'Groups',
    balance: 'Balance',
    profile: 'Profile',
    settings: 'Settings',
    premium: 'Premium',
    notifications: 'Notifications',
  },
  auth: {
    welcome: 'Welcome to WeSplit',
    getStarted: 'Get Started',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    logout: 'Logout',
    createAccount: 'Create Account',
    forgotPassword: 'Forgot Password?',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    name: 'Full Name',
    verificationCode: 'Verification Code',
    enterCode: 'Enter the code sent to your email',
    resendCode: 'Resend Code',
    loginSuccess: 'Successfully logged in',
    loginError: 'Login failed',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    invalidEmail: 'Please enter a valid email',
    weakPassword: 'Password must be at least 6 characters',
    passwordMismatch: 'Passwords do not match',
  },
  groups: {
    title: 'Groups',
    createGroup: 'Create Group',
    joinGroup: 'Join Group',
    groupName: 'Group Name',
    description: 'Description',
    members: 'Members',
    expenses: 'Expenses',
    balances: 'Balances',
    settings: 'Settings',
    leaveGroup: 'Leave Group',
    deleteGroup: 'Delete Group',
    inviteCode: 'Invite Code',
    shareCode: 'Share Code',
    noGroups: 'No groups yet. Create or join one to get started!',
    groupCreated: 'Group created successfully',
    groupJoined: 'Joined group successfully',
    groupLeft: 'Left group successfully',
    groupDeleted: 'Group deleted successfully',
    inviteMembers: 'Invite Members',
    groupDetails: 'Group Details',
    totalExpenses: 'Total Expenses',
    yourBalance: 'Your Balance',
    groupBalance: 'Group Balance',
  },
  expenses: {
    title: 'Expenses',
    addExpense: 'Add Expense',
    editExpense: 'Edit Expense',
    deleteExpense: 'Delete Expense',
    amount: 'Amount',
    description: 'Description',
    category: 'Category',
    paidBy: 'Paid by',
    splitBetween: 'Split between',
    date: 'Date',
    receipt: 'Receipt',
    noExpenses: 'No expenses yet. Add one to get started!',
    expenseAdded: 'Expense added successfully',
    expenseUpdated: 'Expense updated successfully',
    expenseDeleted: 'Expense deleted successfully',
    invalidAmount: 'Please enter a valid amount',
    descriptionRequired: 'Description is required',
    categoryRequired: 'Please select a category',
    splitEvenly: 'Split Evenly',
    splitUnequally: 'Split Unequally',
    splitByShares: 'Split by Shares',
    splitByPercentage: 'Split by Percentage',
    totalAmount: 'Total Amount',
    remainingAmount: 'Remaining Amount',
    splitDetails: 'Split Details',
  },
  balance: {
    title: 'Balance',
    youOwe: 'You owe',
    owesYou: 'Owes you',
    settleUp: 'Settle Up',
    sendReminder: 'Send Reminder',
    markAsPaid: 'Mark as Paid',
    noBalance: 'All settled up!',
    balanceSettled: 'Balance settled successfully',
    reminderSent: 'Reminder sent successfully',
    overallBalance: 'Overall Balance',
    groupBalances: 'Group Balances',
    individualBalances: 'Individual Balances',
    settleAll: 'Settle All',
  },
  wallet: {
    title: 'Wallet',
    connect: 'Connect Wallet',
    disconnect: 'Disconnect',
    balance: 'Balance',
    address: 'Address',
    transactions: 'Transactions',
    send: 'Send',
    receive: 'Receive',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    notConnected: 'Wallet not connected',
    connecting: 'Connecting...',
    connected: 'Wallet connected',
    connectionFailed: 'Connection failed',
    invalidAddress: 'Invalid wallet address',
    insufficientFunds: 'Insufficient funds',
    transactionSent: 'Transaction sent successfully',
    transactionFailed: 'Transaction failed',
    copyAddress: 'Copy Address',
    addressCopied: 'Address copied to clipboard',
  },
  premium: {
    title: 'Premium Features',
    features: 'Features',
    subscribe: 'Subscribe',
    cancel: 'Cancel',
    restore: 'Restore Purchases',
    monthly: 'Monthly',
    yearly: 'Yearly',
    price: 'Price',
    savings: 'Save 17%',
    mostPopular: 'Most Popular',
    paymentMethod: 'Payment Method',
    subscribeNow: 'Subscribe Now',
    subscriptionActive: 'Premium Active',
    subscriptionCancelled: 'Subscription Cancelled',
    paymentSuccessful: 'Payment Successful!',
    paymentFailed: 'Payment Failed',
    comingSoon: 'Coming Soon',
    unlockFeatures: 'Unlock advanced features',
    advancedAnalytics: 'Advanced Analytics',
    unlimitedGroups: 'Unlimited Groups',
    enhancedSecurity: 'Enhanced Security',
    exportReports: 'Export Reports',
    prioritySupport: 'Priority Support',
    fasterTransactions: 'Faster Transactions',
  },
  settings: {
    title: 'Settings',
    profile: 'Profile',
    account: 'Account',
    notifications: 'Notifications',
    language: 'Language',
    currency: 'Currency',
    privacy: 'Privacy',
    security: 'Security',
    about: 'About',
    help: 'Help',
    feedback: 'Feedback',
    rateApp: 'Rate App',
    shareApp: 'Share App',
    version: 'Version',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    contactSupport: 'Contact Support',
    darkMode: 'Dark Mode',
    pushNotifications: 'Push Notifications',
    emailNotifications: 'Email Notifications',
    soundEnabled: 'Sound',
    vibrationEnabled: 'Vibration',
  },
  notifications: {
    title: 'Notifications',
    markAllRead: 'Mark All Read',
    clearAll: 'Clear All',
    noNotifications: 'No notifications',
    newExpense: 'New expense added',
    paymentRequest: 'Payment request',
    balanceUpdate: 'Balance updated',
    groupInvite: 'Group invitation',
    reminderSent: 'Reminder sent',
    notificationSettings: 'Notification Settings',
    enableNotifications: 'Enable Notifications',
    disableNotifications: 'Disable Notifications',
  },
  errors: {
    generic: 'Something went wrong',
    network: 'Network error. Please check your connection.',
    timeout: 'Request timed out. Please try again.',
    unauthorized: 'You are not authorized to perform this action.',
    forbidden: 'Access denied.',
    notFound: 'The requested resource was not found.',
    serverError: 'Server error. Please try again later.',
    validationError: 'Please check your input and try again.',
    unknownError: 'An unknown error occurred.',
    tryAgain: 'Please try again',
    contactSupport: 'If the problem persists, please contact support.',
  },
  success: {
    saved: 'Saved successfully',
    updated: 'Updated successfully',
    deleted: 'Deleted successfully',
    sent: 'Sent successfully',
    received: 'Received successfully',
    completed: 'Completed successfully',
    confirmed: 'Confirmed successfully',
  },
};

// Spanish translations
const spanishTranslations: TranslationKeys = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    done: 'Hecho',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    confirm: 'Confirmar',
    yes: 'Sí',
    no: 'No',
    ok: 'OK',
    error: 'Error',
    success: 'Éxito',
    loading: 'Cargando...',
    retry: 'Reintentar',
    close: 'Cerrar',
    search: 'Buscar',
    filter: 'Filtrar',
    clear: 'Limpiar',
    select: 'Seleccionar',
  },
  navigation: {
    dashboard: 'Panel',
    groups: 'Grupos',
    balance: 'Balance',
    profile: 'Perfil',
    settings: 'Configuración',
    premium: 'Premium',
    notifications: 'Notificaciones',
  },
  auth: {
    welcome: 'Bienvenido a WeSplit',
    getStarted: 'Comenzar',
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    logout: 'Cerrar Sesión',
    createAccount: 'Crear Cuenta',
    forgotPassword: '¿Olvidaste tu contraseña?',
    email: 'Correo',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    name: 'Nombre Completo',
    verificationCode: 'Código de Verificación',
    enterCode: 'Ingresa el código enviado a tu correo',
    resendCode: 'Reenviar Código',
    loginSuccess: 'Sesión iniciada exitosamente',
    loginError: 'Error al iniciar sesión',
    emailRequired: 'El correo es requerido',
    passwordRequired: 'La contraseña es requerida',
    invalidEmail: 'Por favor ingresa un correo válido',
    weakPassword: 'La contraseña debe tener al menos 6 caracteres',
    passwordMismatch: 'Las contraseñas no coinciden',
  },
  groups: {
    title: 'Grupos',
    createGroup: 'Crear Grupo',
    joinGroup: 'Unirse a Grupo',
    groupName: 'Nombre del Grupo',
    description: 'Descripción',
    members: 'Miembros',
    expenses: 'Gastos',
    balances: 'Balances',
    settings: 'Configuración',
    leaveGroup: 'Salir del Grupo',
    deleteGroup: 'Eliminar Grupo',
    inviteCode: 'Código de Invitación',
    shareCode: 'Compartir Código',
    noGroups: '¡Aún no hay grupos. Crea o únete a uno para comenzar!',
    groupCreated: 'Grupo creado exitosamente',
    groupJoined: 'Te uniste al grupo exitosamente',
    groupLeft: 'Saliste del grupo exitosamente',
    groupDeleted: 'Grupo eliminado exitosamente',
    inviteMembers: 'Invitar Miembros',
    groupDetails: 'Detalles del Grupo',
    totalExpenses: 'Gastos Totales',
    yourBalance: 'Tu Balance',
    groupBalance: 'Balance del Grupo',
  },
  // ... continue with other sections for Spanish
  expenses: englishTranslations.expenses, // Simplified for demo
  balance: englishTranslations.balance,
  wallet: englishTranslations.wallet,
  premium: englishTranslations.premium,
  settings: englishTranslations.settings,
  notifications: englishTranslations.notifications,
  errors: englishTranslations.errors,
  success: englishTranslations.success,
};

// All translations
const translations: Record<SupportedLanguage, TranslationKeys> = {
  en: englishTranslations,
  es: spanishTranslations,
  fr: englishTranslations, // Use English as fallback for now
  de: englishTranslations,
  it: englishTranslations,
  pt: englishTranslations,
  zh: englishTranslations,
  ja: englishTranslations,
  ko: englishTranslations,
  ar: englishTranslations,
};

const STORAGE_KEY = '@WeSplit:language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

class I18nService {
  private currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
  private currentTranslations: TranslationKeys = englishTranslations;
  private listeners: ((language: SupportedLanguage) => void)[] = [];

  // Initialize the service
  async initialize(): Promise<void> {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLanguage && this.isValidLanguage(savedLanguage)) {
        await this.setLanguage(savedLanguage as SupportedLanguage);
      }
    } catch (error) {
      console.warn('Failed to load saved language:', error);
    }
  }

  // Check if language code is valid
  private isValidLanguage(language: string): boolean {
    return Object.keys(SUPPORTED_LANGUAGES).includes(language);
  }

  // Get current language
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  // Get available languages
  getAvailableLanguages(): { code: SupportedLanguage; name: string; nativeName: string; flag: string }[] {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
      code: code as SupportedLanguage,
      ...info,
    }));
  }

  // Set language
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.isValidLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    this.currentLanguage = language;
    this.currentTranslations = translations[language];

    try {
      await AsyncStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(language));
  }

  // Subscribe to language changes
  subscribe(listener: (language: SupportedLanguage) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get translation by key path
  t(keyPath: string): string {
    const keys = keyPath.split('.');
    let value: any = this.currentTranslations;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`Translation missing for key: ${keyPath}`);
        return keyPath; // Return the key path as fallback
      }
    }

    return typeof value === 'string' ? value : keyPath;
  }

  // Get translation with parameters
  tParams(keyPath: string, params: Record<string, string | number>): string {
    let translation = this.t(keyPath);
    
    Object.entries(params).forEach(([key, value]) => {
      translation = translation.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });

    return translation;
  }

  // Get translations object for a section
  getSection(section: keyof TranslationKeys): any {
    return this.currentTranslations[section] || {};
  }

  // Get all current translations
  getAllTranslations(): TranslationKeys {
    return this.currentTranslations;
  }

  // Detect device language
  getDeviceLanguage(): SupportedLanguage {
    // In React Native, you might use react-native-localize
    // For now, we'll return English as default
    return DEFAULT_LANGUAGE;
  }

  // Check if RTL language
  isRTL(): boolean {
    return this.currentLanguage === 'ar';
  }
}

// Export singleton instance
export const i18nService = new I18nService();

// Export hook for React components
export const useTranslation = () => {
  const [language, setLanguage] = React.useState<SupportedLanguage>(i18nService.getCurrentLanguage());

  React.useEffect(() => {
    const unsubscribe = i18nService.subscribe(setLanguage);
    return unsubscribe;
  }, []);

  return {
    t: i18nService.t.bind(i18nService),
    tParams: i18nService.tParams.bind(i18nService),
    language,
    setLanguage: i18nService.setLanguage.bind(i18nService),
    availableLanguages: i18nService.getAvailableLanguages(),
    isRTL: i18nService.isRTL(),
  };
};

// Export for backward compatibility
export default i18nService; 