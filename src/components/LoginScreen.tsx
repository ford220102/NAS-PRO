import { useState } from 'react';
import { C } from '../data/theme';

interface LoginScreenProps {
  onLogin: (user: { username: string; isAdmin: boolean }) => void;
}

const DEMO_USERS = [
  { username: 'admin', password: 'admin', isAdmin: true },
  { username: 'user', password: 'user123', isAdmin: false },
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingUser, setPendingUser] = useState<typeof DEMO_USERS[0] | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = DEMO_USERS.find(u => u.username === username && u.password === password);
    if (!user) { setError('Invalid username or password'); return; }
    if (user.isAdmin) {
      setPendingUser(user);
      setMfaStep(true);
    } else {
      onLogin(user);
    }
  };

  const handleMfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode === '123456' || mfaCode.length === 6) {
      onLogin(pendingUser!);
    } else {
      setError('Invalid verification code');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Inter", system-ui, sans-serif', color: C.text,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${C.border}22 1px, transparent 1px), linear-gradient(90deg, ${C.border}22 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />
      <div style={{
        position: 'absolute', top: '10%', left: '15%',
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.accent}0a 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%',
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.blue}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 400, position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 30px ${C.accentGlow}`,
            }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 16 }}>UG</span>
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
            UGOS <span style={{ color: C.accent }}>Pro</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>NAS Management Platform</div>
        </div>

        {/* Card */}
        <div style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 32,
          boxShadow: `0 32px 80px rgba(0,0,0,0.6)`,
        }}>
          {!mfaStep ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Sign in to your NAS</div>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Username</label>
                  <input
                    type="text" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{ ...inputStyle, paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14,
                    }}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                {error && <div style={{ fontSize: 12, color: C.red, padding: '8px 12px', background: C.redDim, borderRadius: 7, border: `1px solid ${C.red}44` }}>{error}</div>}
                <button type="submit" style={{
                  padding: '12px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
                  color: '#000', border: 'none', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', marginTop: 4,
                  boxShadow: `0 0 20px ${C.accentGlow}`,
                }}>
                  Sign In
                </button>
              </form>
              <div style={{ marginTop: 20, padding: 14, background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Demo credentials:</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.textSub, lineHeight: '1.8' }}>
                  admin / admin (admin + 2FA: 123456)<br />
                  user / user123
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔐</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Two-Factor Authentication</div>
                <div style={{ fontSize: 12, color: C.muted }}>Enter the 6-digit code from your authenticator app</div>
              </div>
              <form onSubmit={handleMfa} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      type="text" maxLength={1}
                      value={mfaCode[i] ?? ''}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        const arr = mfaCode.split('');
                        arr[i] = v;
                        const next = arr.join('').slice(0, 6);
                        setMfaCode(next);
                        if (v && i < 5) {
                          const nextInput = document.getElementById(`mfa-${i + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      id={`mfa-${i}`}
                      style={{
                        width: 44, height: 52, textAlign: 'center',
                        background: C.panel2, border: `1px solid ${C.border}`,
                        borderRadius: 10, color: C.text, fontSize: 22, fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  ))}
                </div>
                {error && <div style={{ fontSize: 12, color: C.red, textAlign: 'center' }}>{error}</div>}
                <button type="submit" style={{
                  padding: '12px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
                  color: '#000', border: 'none', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer',
                }}>
                  Verify & Sign In
                </button>
                <button type="button" onClick={() => { setMfaStep(false); setError(''); setMfaCode(''); }} style={{
                  background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12,
                }}>
                  ← Back to login
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: C.muted }}>
          UGOS Pro v3.2 · UGREEN Technology
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: '#0a1018', border: `1px solid ${C.border}`,
  borderRadius: 9, color: C.text, fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
};
