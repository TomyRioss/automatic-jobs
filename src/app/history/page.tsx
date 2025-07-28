'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

interface Application {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'linkedin', 'bumeran', 'zonajobs'

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const response = await fetch('/api/history');
        const data = await response.json();
        setApplications(data);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const filteredApplications =
    filter === 'all'
      ? applications
      : applications.filter(app => app.source === filter);

  const handleDelete = async (
    type: 'single' | 'source' | 'all',
    id?: string,
    source?: string,
  ) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    let url = '/api/history?';
    if (type === 'single' && id) {
      url += `id=${id}`;
    } else if (type === 'source' && source) {
      url += `source=${source}`;
    } else if (type === 'all') {
      url += 'all=true';
    }

    if (
      !confirm('Are you sure you want to delete? This action cannot be undone.')
    ) {
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setApplications(prev => {
          if (type === 'single' && id) {
            return prev.filter(app => app.id !== id);
          } else if (type === 'source' && source) {
            return prev.filter(app => app.source !== source);
          } else if (type === 'all') {
            return [];
          }
          return prev;
        });
      } else {
        console.error('Failed to delete');
        alert('Failed to delete history. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('An error occurred while deleting. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold">
            Historial de Postulaciones
          </h1>
          <Link
            href="/"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-lg font-semibold transition-all"
          >
            Volver
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Botones de Filtro */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                filter === 'all'
                  ? 'bg-cyan-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('linkedin')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                filter === 'linkedin'
                  ? 'bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              LinkedIn
            </button>
            <button
              onClick={() => setFilter('bumeran')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                filter === 'bumeran'
                  ? 'bg-yellow-500'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Bumeran
            </button>
            <button
              onClick={() => setFilter('zonajobs')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                filter === 'zonajobs'
                  ? 'bg-green-500'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              ZonaJobs
            </button>
          </div>
          {/* Botones de Eliminación */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDelete('source', undefined, 'linkedin')}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-semibold"
            >
              Limpiar LinkedIn
            </button>
            <button
              onClick={() => handleDelete('source', undefined, 'bumeran')}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-semibold"
            >
              Limpiar Bumeran
            </button>
            <button
              onClick={() => handleDelete('source', undefined, 'zonajobs')}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold"
            >
              Limpiar ZonaJobs
            </button>
            <button
              onClick={() => handleDelete('all')}
              className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded-lg text-sm font-semibold"
            >
              Limpiar Todo
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-white">Cargando historial...</p>
        ) : (
          <>
            {filteredApplications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {filteredApplications.map(app => (
                  <Link
                    href={`/history/${app.id}`}
                    key={app.id}
                    className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
                      {app.title}
                    </h5>
                    <p className="font-normal text-gray-700 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                      {app.description || 'Sin descripción disponible.'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center">
                No hay postulaciones en el historial
                {filter !== 'all' ? ` para ${filter}` : ''}.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
