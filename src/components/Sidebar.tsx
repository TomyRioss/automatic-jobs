'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserIcon from './UserIcon';
import { useState, useEffect } from 'react';

interface User {
  name: string;
}

export default function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const [totalApplications, setTotalApplications] = useState<number | null>(
    null,
  );

  useEffect(() => {
    // Fetch stats on component mount
    const fetchTotalApplications = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setTotalApplications(data.totalApplications);
      } catch (error) {
        console.error('Error fetching total applications:', error);
        setTotalApplications(0);
      }
    };
    fetchTotalApplications();
  }, []);

  return (
    <aside className="w-64 bg-gray-800 p-4 flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-cyan-400">
          <Link href="/">GetaJob</Link>
        </h1>
        <UserIcon user={user} />
      </div>

      <nav className="space-y-2 flex-grow">
        <Link
          href="/"
          className={`w-full text-left block px-4 py-2 rounded-md transition-colors ${
            pathname === '/' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'
          }`}
        >
          Postulaciones
        </Link>
        <Link
          href="/history"
          className={`w-full text-left block px-4 py-2 rounded-md transition-colors ${
            pathname === '/history'
              ? 'bg-cyan-600 text-white'
              : 'hover:bg-gray-700'
          }`}
        >
          Historial
        </Link>
      </nav>

      <div className="bg-gray-900 p-3 rounded-lg shadow-lg mb-4 text-center">
        <h2 className="text-md font-bold text-white mb-2">
          Postulaciones Totales
        </h2>
        <div className="text-3xl font-bold text-green-400">
          {totalApplications === null ? '...' : totalApplications}
        </div>
      </div>
    </aside>
  );
}
