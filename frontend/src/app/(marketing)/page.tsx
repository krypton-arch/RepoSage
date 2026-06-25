'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StaggerContainer, FadeUpItem, PageTransition } from '@/components/ui/animations';
import { AliveTerminal } from '@/components/marketing/AliveTerminal';

export default function LandingPage() {
  const router = useRouter();

  return (
    <PageTransition className="min-h-screen bg-[#0c0e12] text-[#e2e2e8] flex flex-col relative overflow-hidden font-body-md selection:bg-[#6366f1] selection:text-white">
      {/* Subtle Background Grid & CRT Scanlines */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.08) 1px, transparent 1px),
            linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.2) 50%)
          `,
          backgroundSize: '32px 32px, 100% 4px'
        }}
      />

      {/* TopAppBar */}
      <header className="bg-[#111317]/80 backdrop-blur-md border-b-2 border-[#1e293b] sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6366f1] text-[28px]">terminal</span>
            <span className="font-headline-md font-bold tracking-tighter text-white">RepoSage</span>
          </div>
          <button 
            className="font-label-caps text-[#6366f1] border-2 border-[#1e293b] font-bold hover:bg-[#6366f1] hover:text-white hover:border-[#6366f1] transition-colors px-6 py-2 rounded-none active:scale-95 bg-transparent"
            onClick={() => router.push('/login')}
          >
            INITIALIZE_LOGIN
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col px-6 gap-16 mt-12 mb-20 max-w-7xl mx-auto w-full relative z-10">
        {/* Status Bar */}
        <div className="flex justify-between items-center border-b-2 border-[#1e293b] pb-2">
          <span className="font-label-caps text-[#38bdf8] uppercase opacity-70">Status: v2.4-STABLE</span>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-none bg-[#10b981] animate-pulse"></div>
            <span className="font-label-caps text-[#94a3b8]">AST_ENGINE::READY</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-stretch">
          <StaggerContainer className="flex-1 flex flex-col justify-center gap-8">
            <FadeUpItem>
              <h1 className="font-headline-lg text-[42px] lg:text-[64px] text-white leading-[1.05] tracking-tighter">
                The Undeniable Air-Gapped <br/><span className="text-[#6366f1] drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">Code Intelligence</span> Engine.
              </h1>
            </FadeUpItem>
            <FadeUpItem>
              <p className="font-body-lg text-[#94a3b8] max-w-xl text-lg">
                Deterministic, AST-aware retrieval that never leaves your infrastructure. <span className="text-white font-bold">100% private. 100% secure.</span>
              </p>
            </FadeUpItem>
            <FadeUpItem>
              <div className="flex flex-col sm:flex-row gap-6 mt-4 items-start">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#6366f1] text-white font-label-caps tracking-widest text-sm py-4 px-8 rounded-none border-2 border-[#6366f1] shadow-[6px_6px_0px_0px_rgba(30,41,59,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(30,41,59,1)] hover:translate-x-1 hover:translate-y-1 flex items-center gap-3"
                  onClick={() => router.push('/dashboard')}
                >
                  EXPLORE_WORKSPACE
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </motion.button>
              </div>
              <div className="flex items-center gap-2 text-[#94a3b8] mt-8">
                <span className="material-symbols-outlined text-[16px] text-[#10b981]">verified_user</span>
                <span className="font-label-caps text-xs tracking-widest">FIPS 140-2 COMPLIANT ENVIRONMENT</span>
              </div>
            </FadeUpItem>
          </StaggerContainer>

          <FadeUpItem className="flex-1 w-full flex items-center">
            <div className="w-full">
              <AliveTerminal />
            </div>
          </FadeUpItem>
        </section>

        {/* Feature Grid (Asymmetrical) */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {/* Main Hero Feature - Spans 2 columns */}
          <FadeUpItem className="md:col-span-2 md:row-span-2 h-full">
            <motion.div 
              whileHover={{ scale: 1.01, rotateX: 2, rotateY: -2 }}
              className="border-2 border-[#1e293b] bg-[#111317] p-8 flex flex-col gap-6 h-full group hover:border-[#6366f1] transition-colors relative overflow-hidden"
              style={{ transformPerspective: 1000 }}
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <span className="material-symbols-outlined text-[150px]">hub</span>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <span className="material-symbols-outlined text-[#6366f1] text-[32px]">hub</span>
                <h3 className="font-headline-md text-white text-2xl font-bold">100% Air-Gapped</h3>
              </div>
              <p className="font-body-lg text-[#94a3b8] max-w-md relative z-10 text-lg">
                Zero outbound telemetry. All processing stays within your physical or virtual perimeter. Models are loaded directly into VRAM on local hardware.
              </p>
              <div className="mt-auto pt-6 flex items-center justify-between border-t-2 border-[#1e293b] relative z-10">
                <span className="font-label-caps text-[#38bdf8] bg-[#38bdf8]/10 px-3 py-1 rounded-sm">NET_MODE: ISO_OFF</span>
                <span className="material-symbols-outlined text-[20px] text-[#94a3b8] group-hover:text-[#6366f1] transition-colors">arrow_forward</span>
              </div>
            </motion.div>
          </FadeUpItem>

          {/* Secondary Features */}
          <FadeUpItem className="h-full">
            <motion.div 
              whileHover={{ scale: 1.02, y: -4 }}
              className="border-2 border-[#1e293b] bg-[#111317] p-6 flex flex-col gap-4 h-full group hover:border-[#6366f1] transition-all shadow-[4px_4px_0px_0px_rgba(30,41,59,0)] hover:shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#6366f1]">account_tree</span>
                <h3 className="font-headline-sm text-white font-bold">AST-Aware Chunking</h3>
              </div>
              <p className="font-body-md text-[#94a3b8]">Syntax-aware code indexing that respects scope and logic boundaries.</p>
              <div className="mt-auto pt-4 flex items-center justify-between border-t-2 border-[#1e293b]">
                <span className="font-label-caps text-[10px] text-[#94a3b8]">RETRIEVAL: DETERMINISTIC</span>
              </div>
            </motion.div>
          </FadeUpItem>

          <FadeUpItem className="h-full">
            <motion.div 
              whileHover={{ scale: 1.02, y: -4 }}
              className="border-2 border-[#1e293b] bg-[#111317] p-6 flex flex-col gap-4 h-full group hover:border-[#6366f1] transition-all shadow-[4px_4px_0px_0px_rgba(30,41,59,0)] hover:shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#6366f1]">bolt</span>
                <h3 className="font-headline-sm text-white font-bold">Sub-ms Search</h3>
              </div>
              <p className="font-body-md text-[#94a3b8]">Ultra-fast local vector retrieval using specialized HNSW indices.</p>
              <div className="mt-auto pt-4 flex items-center justify-between border-t-2 border-[#1e293b]">
                <span className="font-label-caps text-[10px] text-[#94a3b8]">LATENCY: &lt;0.42MS</span>
              </div>
            </motion.div>
          </FadeUpItem>

          <FadeUpItem className="md:col-span-3">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="border-2 border-[#1e293b] bg-[#111317] p-6 flex flex-col sm:flex-row items-center gap-6 group hover:border-[#6366f1] transition-colors shadow-[6px_6px_0px_0px_rgba(30,41,59,1)]"
            >
              <div className="w-16 h-16 shrink-0 bg-[#1e293b] flex items-center justify-center rounded-sm">
                <span className="material-symbols-outlined text-[#6366f1] text-[32px]">key_off</span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline-sm text-white font-bold mb-2">No API Keys Required</h3>
                <p className="font-body-md text-[#94a3b8]">Runs entirely on local-first inference. No credit card, no recurring costs, no SaaS vulnerabilities. You own the compute and the data.</p>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-2 sm:border-l-2 sm:border-[#1e293b] sm:pl-6 sm:ml-auto">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-none bg-[#10b981] animate-pulse"></span>
                  <span className="font-label-caps text-[#10b981] tracking-widest">LOCAL_LLM</span>
                </div>
              </div>
            </motion.div>
          </FadeUpItem>
        </StaggerContainer>
      </main>

      {/* Footer */}
      <footer className="bg-[#0c0e12] border-t-2 border-[#1e293b] w-full mt-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 py-8 gap-4 max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-code-md font-bold text-white uppercase tracking-widest">RepoSage_Systems</span>
            <p className="font-label-caps text-[#94a3b8] opacity-80 mt-1">© 2024 RepoSage Systems. Air-Gapped Intelligence.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <a className="font-label-caps tracking-widest text-[#94a3b8] hover:text-[#6366f1] transition-colors flex items-center gap-1" href="#"><span className="opacity-50">/</span>SECURITY</a>
            <a className="font-label-caps tracking-widest text-[#94a3b8] hover:text-[#6366f1] transition-colors flex items-center gap-1" href="#"><span className="opacity-50">/</span>DOCS</a>
            <a className="font-label-caps tracking-widest text-[#94a3b8] hover:text-[#6366f1] transition-colors flex items-center gap-1" href="#"><span className="opacity-50">/</span>API</a>
          </div>
        </div>
      </footer>
    </PageTransition>
  );
}
