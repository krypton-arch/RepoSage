'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const LOG_LINES = [
  { text: 'Ingesting local_repo/main', type: 'INIT', color: 'text-[var(--secondary)]' },
  { text: 'Parsing module: auth_service.rs', type: 'AST', color: 'text-[var(--primary)]' },
  { text: 'Found 14 function nodes, 2 traits', type: 'AST', color: 'text-[var(--primary)]' },
  { text: 'Checksum verified: SHA-256', type: 'SAFE', color: 'text-[var(--tertiary)]' },
  { text: 'Indexing 1024-dim local vectors', type: 'VEC', color: 'text-[var(--primary-container)]' },
  { text: '0 outbound packets detected.', type: 'DONE', color: 'text-[var(--secondary)]' },
];

export function AliveTerminal() {
  const [displayedLines, setDisplayedLines] = useState<number>(0);
  const [glitch, setGlitch] = useState(false);
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const now = new Date();
    setTimeString(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < LOG_LINES.length) {
        currentLine++;
        setDisplayedLines(currentLine);
      } else {
        // Reset loop after a delay
        setTimeout(() => {
          setDisplayedLines(0);
          currentLine = 0;
        }, 3000);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Occasional Glitch Effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 150);
      }
    }, 4000);
    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className={`border-2 border-[#334155] bg-[#0c0e12] p-4 rounded-none overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(99,102,241,0.2)] transition-transform duration-75 ${glitch ? 'translate-x-1 -translate-y-1' : ''}`}>
      <div className="flex items-center justify-between border-b-2 border-[#334155] mb-4 pb-2">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-none bg-[var(--error)]"></div>
          <div className="w-3 h-3 rounded-none bg-[var(--secondary)]"></div>
          <div className="w-3 h-3 rounded-none bg-[var(--tertiary)]"></div>
        </div>
        <span className="font-code-sm text-[var(--on-surface-variant)] uppercase tracking-widest font-bold">secure_daemon.log</span>
      </div>
      <div className="font-code-md text-[var(--tertiary-fixed-dim)] leading-loose whitespace-pre-wrap min-h-[250px]">
        {LOG_LINES.slice(0, displayedLines).map((line, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-start gap-3 ${glitch && idx === displayedLines - 1 ? 'opacity-50 blur-[1px]' : ''}`}
          >
            <span className="opacity-50">[{timeString}]</span>
            <span className={`${line.color} font-bold w-12 shrink-0`}>{line.type}</span>
            <span className="text-[var(--on-surface)]">{line.text}</span>
          </motion.div>
        ))}
        <motion.div 
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-3 h-5 bg-[var(--primary)] mt-2"
        />
      </div>
      <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none">
        <span className="material-symbols-outlined text-[120px]">security</span>
      </div>
      
      {/* Scanline Overlay inside terminal */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
    </div>
  );
}
