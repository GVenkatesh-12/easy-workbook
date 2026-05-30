import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useUiStore } from '@/store/uiStore';

function App() {
  const darkMode = useUiStore((s) => s.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [darkMode]);

  return <AppShell />;
}

export default App;
