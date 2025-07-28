'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Application {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  createdAt: string;
}

const ApplicationDetailPage = () => {
  const { id } = useParams();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchApplication = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            window.location.href = '/login';
            return;
          }

          const response = await fetch(`/api/history/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setApplication(data);
          } else {
            setError('Failed to fetch application details.');
          }
        } catch (err) {
          setError('An error occurred while fetching the application details.');
        } finally {
          setLoading(false);
        }
      };

      fetchApplication();
    }
  }, [id]);

  if (loading) {
    return <p className="text-center text-white">Loading...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  if (!application) {
    return <p className="text-center text-white">Application not found.</p>;
  }

  return (
    <div className="container mx-auto p-4 text-white">
      <Link
        href="/history"
        className="text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to History
      </Link>
      <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-2">{application.title}</h1>
        <p className="text-gray-400 mb-4">
          Applied on {new Date(application.createdAt).toLocaleDateString()} from{' '}
          <span className="font-semibold capitalize">{application.source}</span>
        </p>
        <div className="prose prose-invert max-w-none">
          <p>{application.description}</p>
        </div>
        <a
          href={application.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          View Original Post
        </a>
      </div>
    </div>
  );
};

export default ApplicationDetailPage;
