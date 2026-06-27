import { useEffect } from 'react';
import { useQuestionStore } from '@/store/questionStore';

/**
 * Hook to warn users about unsaved changes (cropped questions)
 * when they try to close or navigate away from the page.
 */
export function useUnsavedWarning() {
  const questionCount = useQuestionStore((s) => s.questions.length);

  useEffect(() => {
    if (questionCount === 0) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show a generic message, but we set returnValue for compatibility
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [questionCount]);
}
