'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid username or password');
      } else {
        router.push('/dashboard');
        router.refresh();
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
          AUTHENTICATION_REQUIRED
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface-container-lowest)] py-8 px-4 border-2 border-[var(--surface-container)] sm:px-10 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.3)]">
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
                  placeholder="admin"
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/register" className="font-label-caps text-[var(--accent-indigo)] hover:text-[var(--accent-indigo-hover)]">
                  REGISTER_NEW_NODE
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border-2 border-[var(--accent-indigo)] text-white bg-[var(--accent-indigo)] font-label-caps tracking-widest hover:bg-transparent hover:text-[var(--accent-indigo)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'INITIALIZING...' : 'INITIALIZE_SESSION'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
