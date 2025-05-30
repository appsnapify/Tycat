import { Toaster } from 'sonner';

export default function PromoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
      <Toaster />
    </div>
  );
} 