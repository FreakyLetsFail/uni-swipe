// components/Header.js
import Link from 'next/link';
import { FaUniversity, FaHeart, FaUser } from 'react-icons/fa';

export default function Header({ activeTab = 'swipe' }) {
  return (
    <header className="flex justify-between items-center px-4 py-2">
      <Link href="/profile">
        <div className={`w-10 h-10 rounded-full ${activeTab === 'profile' ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'} flex items-center justify-center`}>
          <FaUser />
        </div>
      </Link>
      <Link href="/swipe">
        <h1 className="text-2xl font-bold text-accent">UniSwipe</h1>
      </Link>
      <Link href="/matches">
        <div className={`w-10 h-10 rounded-full ${activeTab === 'matches' ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'} flex items-center justify-center`}>
          <FaHeart />
        </div>
      </Link>
    </header>
  );
}