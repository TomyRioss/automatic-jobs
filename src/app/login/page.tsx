'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Error al iniciar sesión');
      }

      const { token } = await response.json();
      localStorage.setItem('token', token);

      router.push('/'); // Redirect to home on successful login
      router.refresh(); // Refresh the page to update auth state
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center">Iniciar Sesión</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico"
            onChange={handleChange}
            required
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
          />
          <input
            name="password"
            type="password"
            placeholder="Contraseña"
            onChange={handleChange}
            required
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </main>
  );
}
