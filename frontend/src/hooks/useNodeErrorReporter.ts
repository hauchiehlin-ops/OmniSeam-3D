import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { describeNodeError, UploadDeclinedError } from '../api/client';

/** Returns a function that shows a readable alert for a failed cloud-node request
 *  (silent when the user declined the upload). */
export function useNodeErrorReporter(): (err: unknown) => void {
  const { t } = useTranslation();
  return useCallback(
    (err: unknown) => {
      if (err instanceof UploadDeclinedError) return;
      const { key, params } = describeNodeError(err);
      if (key) window.alert(t(key, params));
    },
    [t]
  );
}
