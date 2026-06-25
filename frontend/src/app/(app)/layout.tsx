import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar />
      <div className="app-content flex-1 flex flex-col h-full overflow-hidden ml-[var(--sidebar-width)]">
        {children}
      </div>
    </div>
  );
}
