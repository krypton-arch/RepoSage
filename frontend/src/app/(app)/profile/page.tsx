'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { PageTransition, FadeUpItem, StaggerContainer } from '@/components/ui/animations';
import { useRouter } from 'next/navigation';
import { authApi, UserProfile } from '@/lib/api';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Token Reveal State
  const [password, setPassword] = useState('');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      authApi.me()
        .then(data => setProfile(data))
        .catch(err => setError('Failed to load profile data'))
        .finally(() => setLoading(false));
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleRevealToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setVerifying(true);
    setVerifyError(null);

    try {
      // Use the proxy to hit Django directly to verify password
      const res = await fetch('/api/auth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: profile?.username || session?.user?.name, 
          password 
        }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      setRevealedToken(data.access);
      setTokenVisible(true);
      setPassword('');
    } catch (err: any) {
      setVerifyError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <>
        <Header title="NODE_OPERATOR_PROFILE" />
        <div className="p-8 text-center animate-pulse font-code-md">FETCHING_IDENTITY...</div>
      </>
    );
  }

  if (!profile) return null;

  const clearanceText = profile.stats.clearance_level === 5 
    ? 'LEVEL 5_UNRESTRICTED (Vector Indexing, LLM Execution, Project Mutability)'
    : `LEVEL ${profile.stats.clearance_level}_RESTRICTED`;

  return (
    <>
      <Header title="NODE_OPERATOR_PROFILE" />
      
      <PageTransition className="px-6 py-8 max-w-5xl mx-auto w-full">
        <StaggerContainer className="space-y-8">
          
          <FadeUpItem>
            <div className="bg-[var(--surface-container-lowest)] border-2 border-[var(--surface-container)] shadow-[8px_8px_0px_0px_rgba(30,41,59,0.3)] p-8">
              <div className="flex items-center gap-6 mb-8 pb-8 border-b-2 border-[var(--surface-container)]">
                <div className="w-24 h-24 bg-[var(--accent-indigo)]/10 border-2 border-[var(--accent-indigo)] rounded-none flex items-center justify-center">
                  <span className="material-symbols-outlined text-[48px] text-[var(--accent-indigo)]">shield_person</span>
                </div>
                <div className="flex-1">
                  <h2 className="font-headline-lg text-3xl tracking-tighter text-[var(--on-surface-strong)] uppercase">
                    {profile.username}
                  </h2>
                  <p className="font-code-md text-[var(--accent-emerald)] mt-2">STATUS: ACTIVE</p>
                  <p className="font-code-sm text-[var(--on-surface-variant)] mt-1">
                    ROLE: {profile.is_superuser ? 'AIRGAPPED_ADMINISTRATOR' : 'NODE_OPERATOR'}
                  </p>
                </div>
                <div className="text-right font-code-sm text-[var(--on-surface-variant)] space-y-1">
                  <p>JOINED: {new Date(profile.date_joined).toLocaleDateString()}</p>
                  <p>LAST LOGIN: {profile.last_login ? new Date(profile.last_login).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stats Visualization */}
                <div className="space-y-6">
                  <h3 className="font-label-caps tracking-widest text-sm text-[var(--on-surface-variant)] border-b border-[var(--surface-container)] pb-2">OPERATOR_STATISTICS</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-[var(--surface-dim)] p-4 border border-[var(--surface-container)] flex items-center justify-between group hover:border-[var(--accent-indigo)] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[var(--accent-indigo)]">folder_open</span>
                        <span className="font-label-caps text-sm">Projects Managed</span>
                      </div>
                      <span className="font-code-lg text-2xl text-[var(--on-surface-strong)] font-bold">{profile.stats.projects_created}</span>
                    </div>

                    <div className="bg-[var(--surface-dim)] p-4 border border-[var(--surface-container)] flex items-center justify-between group hover:border-[var(--secondary)] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[var(--secondary)]">forum</span>
                        <span className="font-label-caps text-sm">Queries Executed</span>
                      </div>
                      <span className="font-code-lg text-2xl text-[var(--on-surface-strong)] font-bold">{profile.stats.queries_executed}</span>
                    </div>
                  </div>
                </div>

                {/* Security Data */}
                <div className="space-y-6">
                  <h3 className="font-label-caps tracking-widest text-sm text-[var(--on-surface-variant)] border-b border-[var(--surface-container)] pb-2">SECURITY_CLEARANCE</h3>
                  
                  <div>
                    <h4 className="font-label-caps text-xs text-[var(--on-surface-variant)] mb-2">SYSTEM_CLEARANCE</h4>
                    <div className="bg-[var(--surface-dim)] border border-[var(--surface-container)] p-4 font-code-sm text-[var(--on-surface-strong)]">
                      {clearanceText}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-label-caps text-xs text-[var(--on-surface-variant)] mb-2">AUTHENTICATION_TOKEN (JWT)</h4>
                    <div className="bg-[var(--surface-dim)] border border-[var(--surface-container)] p-4">
                      {tokenVisible && revealedToken ? (
                        <div className="space-y-2">
                          <p className="font-code-sm break-all text-[var(--on-surface-variant)] text-xs h-24 overflow-y-auto p-2 bg-[var(--surface-container-lowest)] border border-[var(--surface-container)]">
                            {revealedToken}
                          </p>
                          <button 
                            onClick={() => { setTokenVisible(false); setRevealedToken(null); }}
                            className="btn btn-ghost btn-sm w-full font-label-caps"
                          >
                            Hide Token
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleRevealToken} className="space-y-3">
                          <p className="font-label-caps text-xs text-[var(--error)]">
                            <span className="material-symbols-outlined text-[14px] align-middle mr-1">lock</span>
                            Requires credential verification
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              placeholder="Enter Password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="flex-1 bg-[var(--surface-container-lowest)] border border-[var(--surface-container)] px-3 py-2 text-sm font-code-sm focus:border-[var(--accent-indigo)] outline-none"
                              disabled={verifying}
                            />
                            <button 
                              type="submit" 
                              className="btn btn-primary px-4 py-2"
                              disabled={!password || verifying}
                            >
                              {verifying ? 'VERIFYING...' : 'REVEAL'}
                            </button>
                          </div>
                          {verifyError && <p className="text-[var(--error)] text-xs font-code-sm">{verifyError}</p>}
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeUpItem>

          <FadeUpItem>
            <div className="flex justify-end gap-4 mt-8">
              <button 
                onClick={handleLogout}
                className="btn btn-outline border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white"
              >
                <span className="material-symbols-outlined">logout</span>
                TERMINATE_SESSION
              </button>
            </div>
          </FadeUpItem>

        </StaggerContainer>
      </PageTransition>
    </>
  );
}
