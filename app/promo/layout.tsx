// 🚀 OTIMIZAÇÃO PROMO: Layout otimizado com Toaster para performance melhorada
import { Toaster } from 'sonner';

export default function PromoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(31, 41, 55, 0.95)',
            color: 'white',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
    </div>
  );
} 