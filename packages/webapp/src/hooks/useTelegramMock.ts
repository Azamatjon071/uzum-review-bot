import { useMemo } from 'react';

export function useTelegramMock() {
  return useMemo(() => {
    // If window.Telegram is not available or WebApp is not initiated
    return !window.Telegram?.WebApp?.initData;
  }, []);
}
