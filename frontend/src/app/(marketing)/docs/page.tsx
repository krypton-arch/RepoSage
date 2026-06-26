import Link from 'next/link';
import { PageTransition, FadeUpItem } from '@/components/ui/animations';

export default function DocsPage() {
  return (
    <PageTransition className="min-h-screen flex flex-col items-center justify-center p-8 text-[var(--on-surface)] bg-[var(--surface-container-lowest)]">
      <FadeUpItem>
        <div className="max-w-3xl text-center flex flex-col items-center gap-6 border-2 border-[var(--surface-container)] bg-[var(--surface-dim)] p-12 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
          <span className="material-symbols-outlined text-[64px] text-[var(--secondary)]">menu_book</span>
          <h1 className="text-4xl md:text-6xl font-headline-lg font-bold tracking-tighter uppercase text-[var(--on-surface-strong)]">Documentation</h1>
          <p className="font-body-lg text-[var(--on-surface-variant)] leading-relaxed">
            Welcome to the RepoSage technical documentation. Here you can find system architecture details, local LLM configuration guides, and integration pathways.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/" className="inline-flex items-center justify-center gap-2 border-2 border-[var(--surface-container)] bg-transparent px-6 py-3 font-label-caps text-[var(--on-surface-variant)] hover:text-[var(--on-surface-strong)] hover:border-[var(--surface-container-highest)] transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              GO_BACK
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 border-2 border-[var(--secondary)] bg-[var(--secondary)]/10 px-6 py-3 font-label-caps text-[var(--secondary)] hover:bg-[var(--secondary)]/20 transition-colors">
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              ENTER_DASHBOARD
            </Link>
          </div>
        </div>
      </FadeUpItem>
    </PageTransition>
  );
}
