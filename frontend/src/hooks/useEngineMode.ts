import { useCallback, useEffect, useState } from 'react';
import { apiClient, EngineMode } from '../api/client';

/**
 * Processing engine: 'client' (on-device) or 'server' (cloud node).
 * The setter keeps `apiClient` in sync immediately, so a request started in
 * the same tick already uses the new mode.
 */
export function useEngineMode(): [EngineMode, (mode: EngineMode) => void] {
  const [engineMode, setState] = useState<EngineMode>(
    apiClient.getStoredBackendUrl() ? 'server' : 'client'
  );

  const setEngineMode = useCallback((mode: EngineMode) => {
    apiClient.setEngineMode(mode);
    setState(mode);
  }, []);

  useEffect(() => {
    apiClient.setEngineMode(engineMode);
  }, [engineMode]);

  return [engineMode, setEngineMode];
}
