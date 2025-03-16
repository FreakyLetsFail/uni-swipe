import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'UniSwipe - Finde deine Traumuniversität',
  description: 'Swipe durch Universitäten und finde den perfekten Studienort',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <main className="max-w-screen-xl mx-auto px-4">
          {children}
        </main>
      </body>
    </html>
  );
}