import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, AuthGuard } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PollPulse',
  description: 'A public voting/polling app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-background`} suppressHydrationWarning>
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
