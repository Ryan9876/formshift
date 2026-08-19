import { Platform } from 'react-native';

type NativeRoomPlanModule = {
  isSupported(): Promise<boolean>;
  capabilitySummary(): Promise<{ supported: boolean; framework: string; note: string }>;
};

export async function isRoomPlanSupported(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { requireNativeModule } = await import('expo-modules-core');
    return await requireNativeModule<NativeRoomPlanModule>('FormShiftRoomPlan').isSupported();
  } catch {
    return false;
  }
}

export async function roomPlanCapabilitySummary() {
  if (Platform.OS !== 'ios') return { supported: false, framework: 'RoomPlan', note: 'RoomPlan capture is iOS-only.' };
  try {
    const { requireNativeModule } = await import('expo-modules-core');
    return await requireNativeModule<NativeRoomPlanModule>('FormShiftRoomPlan').capabilitySummary();
  } catch {
    return { supported: false, framework: 'RoomPlan', note: 'Native RoomPlan module is not present in this build.' };
  }
}
