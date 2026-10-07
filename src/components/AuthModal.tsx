import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, Lock, Mail, User as UserIcon, Shield, Sparkles, Loader2, LogIn, UserPlus } from 'lucide-react';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithEmail, signUpWithEmail, loginWithGoogle } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [loading, setLoading] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Validation Error', 'Email and password are required');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        await loginWithEmail(email, password);
        success('Welcome Back', 'Signed in successfully with Firebase.');
      } else {
        await signUpWithEmail(email, password, name, role);
        success('Account Created', `Created ${role} account and signed in.`);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please verify credentials.';
      error('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string, demoRole: UserRole, label: string) => {
    setLoadingPreset(label);
    try {
      await loginWithEmail(demoEmail, demoPass, demoRole);
      success('Logged In', `Signed in as ${label} (${demoRole.toUpperCase()})`);
      onClose();
    } catch (err: any) {
      error('Login Error', err?.message || 'Failed to sign in with demo credentials');
    } finally {
      setLoadingPreset(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      success('Google Connected', 'Authenticated successfully with Google.');
      onClose();
    } catch (err: any) {
      error('Google Sign-In Error', err?.message || 'Google authentication was cancelled or blocked.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {mode === 'LOGIN' ? 'Firebase Staff Login' : 'Create Staff Account'}
            </h2>
            <p className="text-xs text-amber-950/80">
              {mode === 'LOGIN'
                ? 'Sign in to access POS, inventory & transactions'
                : 'Register a new user profile with role permissions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-amber-950 hover:bg-amber-600/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Demo Login Cards */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              ⚡ 1-Click Quick Demo Login
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading || !!loadingPreset}
                onClick={() => handleQuickLogin('admin@janani.com', 'admin123', 'admin', 'Admin')}
                className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 text-left transition-all text-xs group disabled:opacity-50"
              >
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <span>👑 Admin</span>
                  {loadingPreset === 'Admin' && <Loader2 className="w-3 h-3 animate-spin text-amber-700" />}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">Full Access</div>
              </button>

              <button
                type="button"
                disabled={loading || !!loadingPreset}
                onClick={() => handleQuickLogin('manager@janani.com', 'manager123', 'manager', 'Manager')}
                className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-300 text-left transition-all text-xs group disabled:opacity-50"
              >
                <div className="font-bold text-blue-950 flex items-center justify-between">
                  <span>💼 Manager</span>
                  {loadingPreset === 'Manager' && <Loader2 className="w-3 h-3 animate-spin text-blue-700" />}
                </div>
                <div className="text-[10px] text-blue-700 mt-0.5">Stock & Orders</div>
              </button>

              <button
                type="button"
                disabled={loading || !!loadingPreset}
                onClick={() => handleQuickLogin('cashier@janani.com', 'cashier123', 'cashier', 'Cashier')}
                className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 text-left transition-all text-xs group disabled:opacity-50"
              >
                <div className="font-bold text-emerald-950 flex items-center justify-between">
                  <span>🏷️ Cashier</span>
                  {loadingPreset === 'Cashier' && <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">POS & Sales</div>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 font-medium">Or enter credentials</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === 'SIGNUP' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Hasan"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Role</label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    >
                      <option value="cashier">Cashier (POS & Sales only - cost hidden)</option>
                      <option value="manager">Manager (Purchases, Inventory & Products)</option>
                      <option value="admin">Administrator (Complete System Access)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@janani.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!loadingPreset}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : mode === 'LOGIN' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Email</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register & Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Alternative options */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              disabled={loading || !!loadingPreset}
              onClick={handleGoogleSignIn}
              className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Continue with Google</span>
            </button>

            <div className="text-center">
              {mode === 'LOGIN' ? (
                <button
                  type="button"
                  onClick={() => setMode('SIGNUP')}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium hover:underline"
                >
                  Need a new staff account? Click to Register
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium hover:underline"
                >
                  Already have an account? Back to Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
