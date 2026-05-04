// apple.md §12 — 앱 셸: Sidebar fixed 240px + main margin-left 240px

import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
      <Sidebar />
      {/* margin-left = Sidebar 너비 240px (apple.md §12) */}
      <div style={{ marginLeft: 240, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
