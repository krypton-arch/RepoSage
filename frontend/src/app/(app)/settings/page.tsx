'use client';

import { useState, useEffect } from 'react';
import { system, SystemSettings } from '@/lib/api';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState<SystemSettings>({
    theme: 'system',
    telemetry_enabled: false,
    ollama_endpoint: 'http://localhost:11434',
    max_concurrent_jobs: 4,
    vector_retention_days: 30,
  });

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const data = await system.getSettings();
        if (active && data) {
          setForm(data);
          if (data.theme) {
            setTheme(data.theme);
          }
        }
      } catch (e) {
        console.error('Failed to fetch settings', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSettings();
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const data = await system.updateSettings(form);
      setForm(data);
      
      // Instantly apply theme using next-themes
      if (data.theme) {
        setTheme(data.theme);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save settings', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 w-full flex items-center justify-center bg-[var(--surface-container-lowest)] h-screen">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[var(--accent-indigo)] animate-ping"></div>
          <span className="font-label-caps tracking-widest text-[var(--on-surface-variant)]">LOADING_CONFIG...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full flex flex-col bg-[var(--surface-container-lowest)] text-[var(--on-surface)] h-[calc(100vh-64px)] overflow-hidden">
      <header className="p-6 border-b-2 border-[var(--surface-container)] bg-[var(--surface-dim)]">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--accent-indigo)] text-[32px]">settings_input_component</span>
            <h1 className="font-headline-md tracking-tighter text-[var(--on-surface-strong)] font-bold">SYSTEM_CONFIG</h1>
          </div>
          <div className="flex items-center gap-4">
            {saved && (
              <span className="font-label-caps text-[var(--accent-emerald)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check</span> COMMITTED
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[var(--accent-indigo)] text-white font-label-caps tracking-widest px-6 py-2 border-2 border-[var(--accent-indigo)] hover:bg-transparent hover:text-[var(--accent-indigo)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
            >
              {saving ? 'WRITING...' : 'APPLY_CHANGES'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full border-x-2 border-[var(--surface-container)]">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0 bg-[var(--surface-dim)] border-r-2 border-[var(--surface-container)] py-6 flex flex-col gap-2">
          <button
            className={`text-left px-6 py-3 font-label-caps tracking-widest transition-colors border-l-2 ${
              activeTab === 'general' 
                ? 'border-[var(--accent-indigo)] text-[var(--on-surface-strong)] bg-[var(--accent-indigo)]/10' 
                : 'border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface-strong)] hover:bg-[var(--surface-container)]/50'
            }`}
            onClick={() => setActiveTab('general')}
          >
            GENERAL_PREFS
          </button>
          <button
            className={`text-left px-6 py-3 font-label-caps tracking-widest transition-colors border-l-2 ${
              activeTab === 'providers' 
                ? 'border-[var(--accent-indigo)] text-[var(--on-surface-strong)] bg-[var(--accent-indigo)]/10' 
                : 'border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface-strong)] hover:bg-[var(--surface-container)]/50'
            }`}
            onClick={() => setActiveTab('providers')}
          >
            LOCAL_LLM
          </button>
          <button
            className={`text-left px-6 py-3 font-label-caps tracking-widest transition-colors border-l-2 ${
              activeTab === 'resources' 
                ? 'border-[var(--accent-indigo)] text-[var(--on-surface-strong)] bg-[var(--accent-indigo)]/10' 
                : 'border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface-strong)] hover:bg-[var(--surface-container)]/50'
            }`}
            onClick={() => setActiveTab('resources')}
          >
            SYSTEM_LIMITS
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--surface-container-lowest)]">
          
          {/* ---- GENERAL TAB ---- */}
          {activeTab === 'general' && (
            <section className="flex flex-col gap-8 max-w-2xl">
              <div>
                <h2 className="font-headline-sm text-[var(--on-surface-strong)] mb-2 border-b border-[var(--surface-container)] pb-2">General Preferences</h2>
                <p className="font-body-md text-[var(--on-surface-variant)]">Core display and behavioral settings.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[var(--on-surface-variant)]">UI_THEME</label>
                  <select
                    className="bg-[var(--surface-bright)] border-2 border-[var(--surface-container)] text-[var(--on-surface-strong)] font-code-md px-4 py-3 outline-none focus:border-[var(--accent-indigo)] transition-colors cursor-pointer appearance-none"
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value as any })}
                  >
                    <option value="system">AUTO (DETECT)</option>
                    <option value="light">LIGHT_MODE</option>
                    <option value="dark">DARK_MODE</option>
                  </select>
                </div>

                <div className="border-2 border-[var(--surface-container)] p-4 flex items-center justify-between bg-[var(--surface-dim)]">
                  <div>
                    <label className="font-label-caps text-[var(--on-surface-strong)] block mb-1">ANALYTICS_TELEMETRY</label>
                    <p className="font-body-sm text-[var(--on-surface-variant)]">Allow anonymous usage data to improve RepoSage.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.telemetry_enabled}
                      onChange={(e) => setForm({ ...form, telemetry_enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-[var(--surface-container)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-indigo)] rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--on-surface-variant)] peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-emerald)]"></div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ---- LLM PROVIDERS TAB ---- */}
          {activeTab === 'providers' && (
            <section className="flex flex-col gap-8 max-w-2xl">
              <div>
                <h2 className="font-headline-sm text-[var(--on-surface-strong)] mb-2 border-b border-[var(--surface-container)] pb-2">Local LLM Configuration</h2>
                <p className="font-body-md text-[var(--on-surface-variant)]">Manage endpoints for air-gapped inference.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[var(--on-surface-variant)]">OLLAMA_API_ENDPOINT</label>
                  <input
                    type="text"
                    className="bg-[var(--surface-bright)] border-2 border-[var(--surface-container)] text-[var(--secondary)] font-code-md px-4 py-3 outline-none focus:border-[var(--accent-indigo)] transition-colors"
                    value={form.ollama_endpoint}
                    onChange={(e) => setForm({ ...form, ollama_endpoint: e.target.value })}
                    placeholder="http://localhost:11434"
                  />
                  <p className="font-code-sm text-[var(--outline)]">Target URL for local Ollama instance.</p>
                </div>
              </div>
            </section>
          )}

          {/* ---- RESOURCES TAB ---- */}
          {activeTab === 'resources' && (
            <section className="flex flex-col gap-8 max-w-2xl">
              <div>
                <h2 className="font-headline-sm text-[var(--on-surface-strong)] mb-2 border-b border-[var(--surface-container)] pb-2">System Limits</h2>
                <p className="font-body-md text-[var(--on-surface-variant)]">Control resource consumption and retention policies.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[var(--on-surface-variant)]">MAX_CONCURRENT_JOBS</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    className="bg-[var(--surface-bright)] border-2 border-[var(--surface-container)] text-[var(--on-surface-strong)] font-code-md px-4 py-3 outline-none focus:border-[var(--accent-indigo)] transition-colors w-32"
                    value={form.max_concurrent_jobs}
                    onChange={(e) => setForm({ ...form, max_concurrent_jobs: parseInt(e.target.value) || 1 })}
                  />
                  <p className="font-code-sm text-[var(--outline)]">Number of background workers for chunking/indexing.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[var(--on-surface-variant)]">VECTOR_RETENTION_DAYS</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="bg-[var(--surface-bright)] border-2 border-[var(--surface-container)] text-[var(--on-surface-strong)] font-code-md px-4 py-3 outline-none focus:border-[var(--accent-indigo)] transition-colors w-32"
                    value={form.vector_retention_days}
                    onChange={(e) => setForm({ ...form, vector_retention_days: parseInt(e.target.value) || 1 })}
                  />
                  <p className="font-code-sm text-[var(--outline)]">Time before pruning unused indices.</p>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}
