import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalActionLog, ActionEndType } from '@/types/actions';
import { STORAGE_KEYS } from '@shared/constants/storage';

export async function getCurrentAnalysis(): Promise<LocalActionLog | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.currentAnalysis);
  return raw ? (JSON.parse(raw) as LocalActionLog) : null;
}

export async function setCurrentAnalysis(log: LocalActionLog): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.currentAnalysis, JSON.stringify(log));
}

export async function completeAnalysis(
  endType: ActionEndType,
  reason?: string
): Promise<void> {
  const current = await getCurrentAnalysis();
  if (!current) return;
  const updated: LocalActionLog = {
    ...current,
    status: endType === 'success' ? 'completed' : 'error',
    completed_at: new Date().toISOString(),
    end_type: endType,
    completion_reason: reason ?? null,
    last_update_time: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.currentAnalysis, JSON.stringify(updated));
}

export async function clearCurrentAnalysis(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.currentAnalysis);
}
