import { useCallback } from 'react';
import { useTelegramMock } from './useTelegramMock';

// Define the impact styles supported by Telegram WebApp
type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

export function useHapticFeedback() {
  const isMock = useTelegramMock();

  const impactOccurred = useCallback((style: ImpactStyle) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    } else if (isMock) {
      console.log(`[Mock] Haptic impact: ${style}`);
    }
  }, [isMock]);

  const notificationOccurred = useCallback((type: NotificationType) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    } else if (isMock) {
      console.log(`[Mock] Haptic notification: ${type}`);
    }
  }, [isMock]);

  const selectionChanged = useCallback(() => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    } else if (isMock) {
      console.log('[Mock] Haptic selection changed');
    }
  }, [isMock]);

  return { impactOccurred, notificationOccurred, selectionChanged };
}
