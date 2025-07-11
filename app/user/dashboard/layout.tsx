import Header from '@/components/user/Header'
import BottomNav from '@/components/user/BottomNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <Header />
      {children}
      <BottomNav />
    </div>
  )
} 