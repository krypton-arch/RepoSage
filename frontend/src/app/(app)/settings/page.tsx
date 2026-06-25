'use client';

import { useState, useEffect } from 'react';
import { system, SystemSettings } from '@/lib/api';

export default function SettingsPage() {
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
      <main className="flex-1 w-full flex items-center justify-center bg-[#0c0e12] h-screen">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#6366f1] animate-ping"></div>
          <span className="font-label-caps tracking-widest text-[#94a3b8]">LOADING_CONFIG...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full flex flex-col bg-[#0c0e12] text-[#e2e2e8] h-[calc(100vh-64px)] overflow-hidden">
      <header className="p-6 border-b-2 border-[#1e293b] bg-[#111317]">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6366f1] text-[32px]">settings_input_component</span>
            <h1 className="font-headline-md tracking-tighter text-white font-bold">SYSTEM_CONFIG</h1>
          </div>
          <div className="flex items-center gap-4">
            {saved && (
              <span className="font-label-caps text-[#10b981] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check</span> COMMITTED
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6366f1] text-white font-label-caps tracking-widest px-6 py-2 border-2 border-[#6366f1] hover:bg-transparent hover:text-[#6366f1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
            >
              {saving ? 'WRITING...' : 'APPLY_CHANGES'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full border-x-2 border-[#1e293b]">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0 bg-[#111317] border-r-2 border-[#1e293b] py-6 flex flex-col gap-2">
          <button
            className={`text-left px-6 py-3 font-label-caps tracking-widest transition-colors border-l-2 ${
              activeTab === 'general' 
                ? 'border-[#6366f1] text-white bg-[#6366f1]/10' 
                : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-[#1e293b]/50'
            }`}
            onClick={() => setActiveTab('general')}
          >
            GENERAL_PREFS
          </button>
          <button
            className={`text-left px-6 py-3 font-label-caps tracking-widest transition-colors border-l-2 ${
              activeTab === 'providers' 
                ? 'border-[#6366f1] text-white bg-[#6366f1]/10' 
                : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-[#1e293b]/50'
            }`}
            onClick={() => setActiveTab('providers')}
          >
            LOCAL_LLM
          </button>
          <button
            className={`text-left px-6 py-3 font-label-caps tracking-widest transition-colors border-l-2 ${
              activeTab === 'resources' 
                ? 'border-[#6366f1] text-white bg-[#6366f1]/10' 
                : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-[#1e293b]/50'
            }`}
            onClick={() => setActiveTab('resources')}
          >
            SYSTEM_LIMITS
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0c0e12]">
          
          {/* ---- GENERAL TAB ---- */}
          {activeTab === 'general' && (
            <section className="flex flex-col gap-8 max-w-2xl">
              <div>
                <h2 className="font-headline-sm text-white mb-2 border-b border-[#1e293b] pb-2">General Preferences</h2>
                <p className="font-body-md text-[#94a3b8]">Core display and behavioral settings.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[#94a3b8]">UI_THEME</label>
                  <select
                    className="bg-[#050505] border-2 border-[#1e293b] text-white font-code-md px-4 py-3 outline-none focus:border-[#6366f1] transition-colors cursor-pointer appearance-none"
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value as any })}
                  >
                    <option value="system">AUTO (DETECT)</option>
                    <option value="light">LIGHT_MODE</option>
                    <option value="dark">DARK_MODE</option>
                  </select>
                </div>

                <div className="border-2 border-[#1e293b] p-4 flex items-center justify-between bg-[#111317]">
                  <div>
                    <label className="font-label-caps text-white block mb-1">ANALYTICS_TELEMETRY</label>
                    <p className="font-body-sm text-[#94a3b8]">Allow anonymous usage data to improve RepoSage.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.telemetry_enabled}
                      onChange={(e) => setForm({ ...form, telemetry_enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-[#1e293b] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#6366f1] rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#94a3b8] peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]"></div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ---- LLM PROVIDERS TAB ---- */}
          {activeTab === 'providers' && (
            <section className="flex flex-col gap-8 max-w-2xl">
              <div>
                <h2 className="font-headline-sm text-white mb-2 border-b border-[#1e293b] pb-2">Local LLM Configuration</h2>
                <p className="font-body-md text-[#94a3b8]">Manage endpoints for air-gapped inference.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[#94a3b8]">OLLAMA_API_ENDPOINT</label>
                  <input
                    type="text"
                    className="bg-[#050505] border-2 border-[#1e293b] text-[#38bdf8] font-code-md px-4 py-3 outline-none focus:border-[#6366f1] transition-colors"
                    value={form.ollama_endpoint}
                    onChange={(e) => setForm({ ...form, ollama_endpoint: e.target.value })}
                    placeholder="http://localhost:11434"
                  />
                  <p className="font-code-sm text-[#475569]">Target URL for local Ollama instance.</p>
                </div>
              </div>
            </section>
          )}

          {/* ---- RESOURCES TAB ---- */}
          {activeTab === 'resources' && (
            <section className="flex flex-col gap-8 max-w-2xl">
              <div>
                <h2 className="font-headline-sm text-white mb-2 border-b border-[#1e293b] pb-2">System Limits</h2>
                <p className="font-body-md text-[#94a3b8]">Control resource consumption and retention policies.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[#94a3b8]">MAX_CONCURRENT_JOBS</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    className="bg-[#050505] border-2 border-[#1e293b] text-white font-code-md px-4 py-3 outline-none focus:border-[#6366f1] transition-colors w-32"
                    value={form.max_concurrent_jobs}
                    onChange={(e) => setForm({ ...form, max_concurrent_jobs: parseInt(e.target.value) || 1 })}
                  />
                  <p className="font-code-sm text-[#475569]">Number of background workers for chunking/indexing.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[#94a3b8]">VECTOR_RETENTION_DAYS</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="bg-[#050505] border-2 border-[#1e293b] text-white font-code-md px-4 py-3 outline-none focus:border-[#6366f1] transition-colors w-32"
                    value={form.vector_retention_days}
                    onChange={(e) => setForm({ ...form, vector_retention_days: parseInt(e.target.value) || 1 })}
                  />
                  <p className="font-code-sm text-[#475569]">Time before pruning unused indices.</p>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}
