'use client';

import { ProjectSettings, RetrievalMode, Visibility } from '@/lib/api';
import { Dispatch, SetStateAction } from 'react';

interface SettingsPanelProps {
  settingsForm: ProjectSettings;
  setSettingsForm: Dispatch<SetStateAction<ProjectSettings>>;
  onSave: () => void;
  saving: boolean;
  status: string | null;
}

export default function SettingsPanel({
  settingsForm,
  setSettingsForm,
  onSave,
  saving,
  status,
}: SettingsPanelProps) {
  return (
    <section>
      <h2 className="section-title">Retrieval Configuration</h2>
      <div className="card">
        <div className="flex flex-col gap-lg">
          {/* Retrieval Mode */}
          <div className="flex flex-col gap-xs">
            <label className="text-label-caps">Retrieval Mode</label>
            <select
              className="input"
              value={settingsForm.retrieval_mode || 'vector'}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, retrieval_mode: e.target.value as RetrievalMode }))}
            >
              <option value="vector">Vector (Semantic)</option>
              <option value="hybrid">Hybrid (Semantic + Lexical)</option>
              <option value="lexical">Lexical (Full-Text)</option>
            </select>
            <p className="text-body-sm text-muted">
              Choose how retrieved chunks are searched. Hybrid combines vector similarity with full-text keyword matching using Reciprocal Rank Fusion.
            </p>
          </div>

          {/* Top K */}
          <div className="flex flex-col gap-xs">
            <label className="text-label-caps">Top K (Chunks to Retrieve)</label>
            <input
              type="number"
              className="input"
              value={settingsForm.retrieval_top_k ?? 10}
              min={1}
              max={50}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, retrieval_top_k: parseInt(e.target.value) || 10 }))}
            />
            <p className="text-body-sm text-muted">
              Number of source chunks retrieved for each query (1–50).
            </p>
          </div>

          {/* Max Context Tokens */}
          <div className="flex flex-col gap-xs">
            <label className="text-label-caps">Max Context Tokens</label>
            <input
              type="number"
              className="input"
              value={settingsForm.max_context_tokens ?? 3000}
              min={500}
              max={16000}
              step={500}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, max_context_tokens: parseInt(e.target.value) || 3000 }))}
            />
            <p className="text-body-sm text-muted">
              Maximum token budget for context assembly in the LLM prompt (500–16,000).
            </p>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-xs">
            <label className="text-label-caps">Visibility</label>
            <select
              className="input"
              value={settingsForm.visibility || 'private'}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, visibility: e.target.value as Visibility }))}
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public">Public</option>
            </select>
            <p className="text-body-sm text-muted">
              Controls who can access this project and its search results.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-md">
            <button
              className="btn btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              <span className="material-symbols-outlined">save</span>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {status && (
              <span
                className={`text-body-sm ${
                  status.startsWith('Error') ? 'text-error' : 'text-secondary'
                }`}
              >
                {status}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
