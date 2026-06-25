export function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'indexed' || s === 'completed' || s === 'processed') return 'badge badge-indexed';
  if (s === 'ingesting' || s === 'running') return 'badge badge-running';
  if (s === 'failed' || s === 'error') return 'badge badge-failed';
  if (s === 'pending' || s === 'queued') return 'badge badge-pending';
  return 'badge badge-created';
}

export function chunkTypeBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === 'code' || t === 'function' || t === 'class') return 'badge badge-code';
  if (t === 'markdown' || t === 'heading') return 'badge badge-markdown';
  if (t === 'config' || t === 'yaml' || t === 'json') return 'badge badge-config';
  return 'badge badge-text';
}

export function languageBadgeClass(lang: string): string {
  const l = lang.toLowerCase();
  if (['python', 'javascript', 'typescript', 'java', 'kotlin', 'go', 'rust', 'c', 'cpp'].includes(l))
    return 'badge badge-code';
  if (['markdown', 'md'].includes(l)) return 'badge badge-markdown';
  if (['json', 'yaml', 'toml', 'xml', 'ini'].includes(l)) return 'badge badge-config';
  return 'badge badge-text';
}

export function confidenceBadgeClass(level: string): string {
  if (level === 'high') return 'badge badge-indexed';
  if (level === 'medium') return 'badge badge-pending';
  if (level === 'low') return 'badge badge-running';
  return 'badge badge-failed';
}
