"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function ApplicationHistoryPage() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const [historyRes, statsRes] = await Promise.all([
        fetch("/api/history", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!historyRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const historyData = await historyRes.json();
      const statsData = await statsRes.json();

      setApplications(historyData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this application?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const url = id ? `/api/history?id=${id}` : "/api/history?deleteAll=true";
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchData(); // Refresh data
      } else {
        console.error("Failed to delete application(s)");
      }
    } catch (error) {
      console.error("Error deleting application(s):", error);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Application History</h1>

      {stats && (
        <div className="mb-8 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold mb-4">Your Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-white dark:bg-gray-700">
              <h3 className="text-lg font-bold">Total Applications</h3>
              <p className="text-2xl">{stats.totalApplications}</p>
            </div>
            <div className="p-4 rounded bg-white dark:bg-gray-700">
              <h3 className="text-lg font-bold">Global Applications (All Users)</h3>
              <p className="text-2xl">{stats.globalTotalApplications}</p>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-bold mb-2">Applications by Source</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.applicationsBySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => handleDelete(null)}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          disabled={applications.length === 0}
        >
          Delete All
        </button>
      </div>

      <div className="space-y-4">
        {applications.map((app) => (
          <div
            key={app.id}
            className="p-4 border rounded-lg flex justify-between items-center bg-white dark:bg-gray-800"
          >
            <div>
              <h2
                className="text-xl font-semibold cursor-pointer"
                onClick={() => router.push(`/history/${app.id}`)}
              >
                {app.title}
              </h2>
              <p className="text-gray-500">
                Applied from {app.source} on {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDelete(app.id)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApplicationHistoryPage;
