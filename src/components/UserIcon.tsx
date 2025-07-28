'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';

// This is a placeholder for the actual user data
// In a real app, this would come from a context or a server-side query
interface User {
  name: string;
}

export default function UserIcon({ user }: { user: User | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-white hover:text-cyan-400"
      >
        <UserCircleIcon className="w-8 h-8" />
        {user && <span>{user.name}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50">
          {user ? (
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              Cerrar sesión
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
