// 🚀 OTIMIZAÇÃO FASE 3: Manter apenas Toaster sonner (usado pelos componentes /promo)
import { Toaster } from 'sonner';

export default function PromoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
      <Toaster position="top-center" />
    </div>
  );
} 