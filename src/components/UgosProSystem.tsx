import { useState, useCallback } from 'react';
import BootScreen from './BootScreen';
import LoginScreen from './LoginScreen';
import Desktop from './Desktop';
import { HardwareInfo } from '../data/catalog';

type Phase = 'boot' | 'login' | 'desktop';

export default function UgosProSystem() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; isAdmin: boolean } | null>(null);

  const handleBoot = useCallback((hw: HardwareInfo) => {
    setHardware(hw);
    setPhase('login');
  }, []);

  const handleLogin = useCallback((user: { username: string; isAdmin: boolean }) => {
    setCurrentUser(user);
    setPhase('desktop');
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setPhase('login');
  }, []);

  if (phase === 'boot' || !hardware) return <BootScreen onComplete={handleBoot} />;
  if (phase === 'login' || !currentUser) return <LoginScreen onLogin={handleLogin} />;
  return <Desktop hardware={hardware} currentUser={currentUser} onLogout={handleLogout} />;
}
