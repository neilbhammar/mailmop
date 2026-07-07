import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@shared/constants/storage';
import * as SecureStore from 'expo-secure-store';
import { clearSenderAnalysis } from './senderAnalysis';
import { clearCurrentAnalysis } from './actionLog';

const REFRESH_TOKEN_KEY = 'mailmop_gmail_refresh_token';

export async function clearAllUserData(): Promise<void> {
  await clearSenderAnalysis();
  await clearCurrentAnalysis();
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.gmailStats,
    STORAGE_KEYS.actions,
    STORAGE_KEYS.viewState,
    STORAGE_KEYS.gmailLabels,
    STORAGE_KEYS.currentAction,
  ]);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
}

export async function checkUserMismatch(currentEmail: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem('mailmop:last_user_email');
  if (stored && stored !== currentEmail) {
    await clearAllUserData();
    await AsyncStorage.setItem('mailmop:last_user_email', currentEmail);
    return true;
  }
  if (!stored) {
    await AsyncStorage.setItem('mailmop:last_user_email', currentEmail);
  }
  return false;
}
