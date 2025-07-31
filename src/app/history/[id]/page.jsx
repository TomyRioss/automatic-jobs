"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function ApplicationDetailPage() {
  const params = useParams();
  const { id } = params;
  const [application, setApplication] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found.");
        }

        const res = await fetch(`/api/history/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch application details.");
        }
        const data = await res.json();
        setApplication(data);
      } catch (error) {
        setError("An error occurred while fetching the application details.", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData().catch((error) => {
      setError("An error occurred while fetching the application details.", error);
    });
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!application) {
    return <div>Application not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{application.title}</h1>
      <p className="text-gray-600 mb-2">Applied from: {application.source}</p>
      <a
        href={application.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
      >
        View Job Posting
      </a>
      <div className="mt-4 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Description</h2>
        <p className="text-gray-800 whitespace-pre-wrap">{application.description}</p>
      </div>
    </div>
  );
}

export default ApplicationDetailPage;
