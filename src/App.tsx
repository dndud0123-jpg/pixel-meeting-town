import { useEffect, useState } from 'react';
import { ScreenView } from './components/screen/ScreenView';
import { MobilePad } from './components/mobile/MobilePad';

export function App() {
  const [role, setRole] = useState<'screen' | 'pad'>('screen');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'pad' || roleParam === 'mobile' || roleParam === 'controller') {
      setRole('pad');
    } else {
      setRole('screen');
    }
  }, []);

  if (role === 'pad') {
    return <MobilePad />;
  }

  return <ScreenView />;
}

export default App;
