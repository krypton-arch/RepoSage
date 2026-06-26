'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { system } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data.username?.[0] || data.password?.[0] || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-body-md">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center font-headline-lg text-[42px] tracking-tighter text-[var(--on-surface-strong)]">
          RepoSage
        </h1>
        <h2 className="mt-2 text-center text-sm font-label-caps tracking-widest text-[var(--on-surface-variant)]">
          REGISTER_NEW_NODE
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface-container-lowest)] py-8 px-4 border-2 border-[var(--surface-container)] sm:px-10 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.3)]">
          {success ? (
             <div className="bg-[var(--accent-emerald)]/10 border-l-4 border-[var(--accent-emerald)] p-4 mb-4">
               <p className="text-sm text-[var(--accent-emerald)] font-bold">NODE_REGISTERED_SUCCESSFULLY</p>
               <p className="text-xs text-[var(--on-surface-variant)] mt-1">Redirecting to session init...</p>
             </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-[var(--error)]/10 border-l-4 border-[var(--error)] p-4">
                  <p className="text-sm text-[var(--error)]">{error}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-label-caps tracking-widest text-[var(--on-surface-strong)]">
                  USERNAME
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 bg-[var(--surface-bright)] border-2 border-[var(--surface-container)] text-[var(--on-surface-strong)] placeholder-[var(--outline)] focus:outline-none focus:border-[var(--accent-indigo)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-label-caps tracking-widest text-[var(--on-surface-strong)]">
                  PASSWORD
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 bg-[var(--surface-bright)] border-2 border-[var(--surface-container)] text-[var(--on-surface-strong)] placeholder-[var(--outline)] focus:outline-none focus:border-[var(--accent-indigo)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-label-caps tracking-widest text-[var(--on-surface-strong)]">
                  CONFIRM_PASSWORD
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 bg-[var(--surface-bright)] border-2 border-[var(--surface-container)] text-[var(--on-surface-strong)] placeholder-[var(--outline)] focus:outline-none focus:border-[var(--accent-indigo)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/login" className="font-label-caps text-[var(--accent-indigo)] hover:text-[var(--accent-indigo-hover)]">
                    RETURN_TO_LOGIN
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border-2 border-[var(--accent-indigo)] text-white bg-[var(--accent-indigo)] font-label-caps tracking-widest hover:bg-transparent hover:text-[var(--accent-indigo)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                >
                  {loading ? 'PROCESSING...' : 'REGISTER_NODE'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
