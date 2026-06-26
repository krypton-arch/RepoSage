import Link from 'next/link';
import { PageTransition, FadeUpItem } from '@/components/ui/animations';

export default function SecurityPage() {
  return (
    <PageTransition className="min-h-screen flex flex-col items-center justify-center p-8 text-[var(--on-surface)] bg-[var(--surface-container-lowest)]">
      <FadeUpItem>
        <div className="max-w-2xl text-center flex flex-col items-center gap-6 border-2 border-[var(--surface-container)] bg-[var(--surface-dim)] p-12 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
          <span className="material-symbols-outlined text-[64px] text-[var(--accent-indigo)]">security</span>
          <h1 className="text-4xl md:text-6xl font-headline-lg font-bold tracking-tighter uppercase text-[var(--on-surface-strong)]">Security</h1>
          <p className="font-body-lg text-[var(--on-surface-variant)] leading-relaxed">
            RepoSage is designed with air-gapped intelligence in mind. Your code never leaves your local machine, and your proprietary data is strictly yours.
          </p>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 border-2 border-[var(--surface-container)] bg-[var(--surface-container)] px-6 py-3 font-label-caps text-[var(--on-surface-strong)] hover:bg-[var(--surface-container-highest)] transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            RETURN_TO_SYSTEM
          </Link>
        </div>
      </FadeUpItem>
    </PageTransition>
  );
}
