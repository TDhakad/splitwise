import { useState } from 'react';
import type { FormEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useGoogleAuth, useLogin, useRegister } from '../features/auth/api';
import { getErrorMessage } from '../lib/constants';

interface SignupViewProps {
  onSignupSuccess: (token: string) => void;
  onSwitchToLogin: () => void;
}

export default function SignupView({ onSignupSuccess, onSwitchToLogin }: SignupViewProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const googleAuth = useGoogleAuth();
  const login = useLogin();
  const register = useRegister();

  const handleGoogleSuccess = async (credential: CredentialResponse['credential']) => {
    if (!credential) {
      setError('Google Signup Failed');
      return;
    }

    try {
      const data = await googleAuth.mutateAsync(credential);
      onSignupSuccess(data.access_token);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      await register.mutateAsync({ email, name: fullName, password });
      const loginData = await login.mutateAsync({ email, password });
      onSignupSuccess(loginData.access_token);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans p-6">
      <div className="w-full max-w-[1000px] mx-auto flex flex-col md:flex-row items-center justify-center gap-12 py-12">
        <div className="hidden md:flex flex-col flex-1 max-w-[450px] relative h-full justify-center">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Equitable Finance</h1>
            <p className="text-lg text-gray-500 max-w-sm">Precision in every split. Vitality in your growth. Security for your future.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#007A64] opacity-80"></div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-[#EAF5F2] flex items-center justify-center text-[#007A64]">
                <span className="material-symbols-outlined">security</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Bank-Grade Security</h3>
                <p className="text-sm text-gray-500">Your data is encrypted end-to-end.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[420px] flex-none">
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl shadow-black/5 border border-gray-100">
            <div className="md:hidden text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Equitable Finance</h1>
              <p className="text-base text-gray-500">Create your account</p>
            </div>
            <div className="hidden md:block mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Get Started</h2>
              <p className="text-base text-gray-500">Join the future of expense management.</p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 tracking-wide uppercase" htmlFor="fullName">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-lg">person</span>
                  </span>
                  <input 
                    type="text" id="fullName" name="fullName" required
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-10 pr-3 py-2.5 focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] focus:outline-none transition-all placeholder:text-gray-400 shadow-sm" 
                    placeholder="Jane Doe" 
                  />
                </div>
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
                    placeholder="jane@example.com" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 tracking-wide uppercase" htmlFor="password">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-lg">lock</span>
                  </span>
                  <input 
                    type="password" id="password" name="password" required minLength={8}
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-10 pr-3 py-2.5 focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] focus:outline-none transition-all placeholder:text-gray-400 shadow-sm" 
                    placeholder="••••••••" 
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters.</p>
              </div>

              <div className="flex items-start mt-6 mb-6">
                <div className="flex items-center h-5">
                  <input id="terms" name="terms" type="checkbox" required className="w-4 h-4 rounded border-gray-300 text-[#007A64] focus:ring-[#007A64]" />
                </div>
                <div className="ml-3">
                  <label htmlFor="terms" className="text-sm text-gray-500">
                    I agree to the <a href="#" className="text-[#007A64] hover:text-[#00604f] transition-colors">Terms of Service</a> and <a href="#" className="text-[#007A64] hover:text-[#00604f] transition-colors">Privacy Policy</a>.
                  </label>
                </div>
              </div>

              <button type="submit" disabled={register.isPending || login.isPending} className="w-full bg-[#007A64] hover:bg-[#00604f] text-white text-sm font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-all duration-200 mt-2 disabled:opacity-70">
                {register.isPending || login.isPending ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-400 text-xs font-semibold uppercase tracking-wider rounded-full">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center w-full min-h-[44px]">
                <GoogleLogin
                  onSuccess={credentialResponse => {
                    handleGoogleSuccess(credentialResponse.credential);
                  }}
                  onError={() => {
                    setError('Google Signup Failed');
                  }}
                  theme="outline"
                  size="large"
                  text="signup_with"
                  width="420"
                />
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Already have an account? 
                <button onClick={onSwitchToLogin} className="text-sm font-bold text-[#007A64] hover:text-[#00604f] transition-colors ml-1">Log in</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
