import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app';
import Constants from 'expo-constants';
import { logger } from '../analytics/loggingService';

let functionsInstance: ReturnType<typeof getFunctions> | null = null;
let emulatorConfigured = false;

const readEnvVar = (key: string): string => {
  if (process.env[key]) {
    return process.env[key]!;
  }

  if (process.env[`EXPO_PUBLIC_${key}`]) {
    return process.env[`EXPO_PUBLIC_${key}`]!;
  }

  if (Constants.expoConfig?.extra?.[key]) {
    return String(Constants.expoConfig.extra[key]);
  }

  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return String(Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`]);
  }

  if ((Constants.manifest as any)?.extra?.[key]) {
    return String((Constants.manifest as any).extra[key]);
  }

  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return String((Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`]);
  }

  return '';
};

const shouldUseProdFunctions = (): boolean => {
  const flag = readEnvVar('USE_PROD_FUNCTIONS');
  return flag === 'true' || flag === '1';
};

const resolveFirebaseApp = () => {
  try {
    return getApp();
  } catch (_error) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseConfig = require('../../config/firebase/firebase');
    return firebaseConfig.default;
  }
};

export const getFirebaseFunctionsClient = () => {
  if (functionsInstance) {
    return functionsInstance;
  }

  const app = resolveFirebaseApp();
  const instance = getFunctions(app, 'us-central1');

  if (__DEV__ && !shouldUseProdFunctions() && !emulatorConfigured) {
    const host = readEnvVar('FUNCTIONS_EMULATOR_HOST') || 'localhost';
    const portValue = readEnvVar('FUNCTIONS_EMULATOR_PORT') || '5001';
    const port = parseInt(portValue, 10);

    try {
      connectFunctionsEmulator(instance, host, port);
      emulatorConfigured = true;
      logger.info('Connected to Firebase Functions emulator', {
        host,
        port,
      }, 'FirebaseFunctionsClient');
    } catch (error: any) {
      if (error?.code !== 'functions/already-initialized') {
        logger.warn('Failed to connect to Functions emulator', {
          host,
          port,
          error: error?.message,
        }, 'FirebaseFunctionsClient');
      } else {
        emulatorConfigured = true;
      }
    }
  }

  functionsInstance = instance;
  return instance;
};

