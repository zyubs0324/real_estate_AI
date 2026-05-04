import Header from '@/components/layout/Header'

export default function DashboardPage() {
  return (
    <>
      <Header title="대시보드" />
      <main className="flex-1 overflow-y-auto p-6">
        <p className="text-slate-400 text-sm">대시보드 콘텐츠가 여기에 표시됩니다.</p>
      </main>
    </>
  )
}
