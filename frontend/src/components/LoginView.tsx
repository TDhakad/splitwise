import { useState } from 'react';
import type { FormEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useGoogleAuth, useLogin } from '../features/auth/api';
import { getErrorMessage } from '../lib/constants';

interface LoginViewProps {
  onLoginSuccess: (token: string) => void;
  onSwitchToSignup: () => void;
}

export default function LoginView({ onLoginSuccess, onSwitchToSignup }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useLogin();
  const googleAuth = useGoogleAuth();

  const handleGoogleSuccess = async (credential: CredentialResponse['credential']) => {
    if (!credential) {
      setError('Google Login Failed');
      return;
    }

    try {
      const data = await googleAuth.mutateAsync(credential);
      onLoginSuccess(data.access_token);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const data = await login.mutateAsync({ email, password });
      onLoginSuccess(data.access_token);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-gray-50 font-sans">
      <div className="hidden lg:flex lg:w-[45%] bg-[#007A64] relative overflow-hidden items-end p-12">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10"></div>
        <div className="relative z-20 max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-white text-[32px]">account_balance_wallet</span>
            <h1 className="text-3xl font-bold tracking-tight text-white">Equitable Finance</h1>
          </div>
          <p className="text-xl font-semibold text-white/90 mb-3">Precision in every split.</p>
          <p className="text-lg text-white/80">Manage your collective expenses with unparalleled clarity and institutional-grade security.</p>
        </div>
      </div>

      <div className="w-full lg:w-[55%] flex flex-col justify-center px-6 sm:px-10 md:px-20 py-12 relative">
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <span className="material-symbols-outlined text-[#007A64]">account_balance_wallet</span>
          <span className="text-xl font-bold text-gray-900">Equitable Finance</span>
        </div>

        <div className="w-full max-w-[420px] mx-auto">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-base text-gray-500">Sign in to access your financial dashboard.</p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex justify-center w-full min-h-[44px]">
              <GoogleLogin
                onSuccess={credentialResponse => {
                  handleGoogleSuccess(credentialResponse.credential);
                }}
                onError={() => {
                  setError('Google Login Failed');
                }}
                useOneTap
                theme="outline"
                size="large"
                width="420"
              />
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 tracking-wide uppercase" htmlFor="email">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-lg">mail</span>
                </span>
                <input 
                  type="email" id="email" name="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-10 pr-3 py-2.5 focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] focus:outline-none transition-all placeholder:text-gray-400 shadow-sm" 
                  placeholder="name@company.com" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-500 tracking-wide uppercase" htmlFor="password">Password</label>
                <a href="#" className="text-xs font-bold text-[#007A64] hover:text-[#00604f] transition-colors">Forgot Password?</a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-lg">lock</span>
                </span>
                <input 
                  type="password" id="password" name="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-10 pr-3 py-2.5 focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] focus:outline-none transition-all placeholder:text-gray-400 shadow-sm" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button type="submit" disabled={login.isPending} className="w-full bg-[#007A64] hover:bg-[#00604f] text-white text-sm font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-all duration-200 mt-6 relative overflow-hidden group disabled:opacity-70 disabled:active:scale-100">
              <span className="relative z-10 flex items-center justify-center gap-2">
                {login.isPending ? 'Logging in...' : 'Log In'}
                {!login.isPending && <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>}
              </span>
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account? 
              <button onClick={onSwitchToSignup} className="text-sm font-bold text-[#007A64] hover:text-[#00604f] transition-colors ml-1">Sign up securely</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
