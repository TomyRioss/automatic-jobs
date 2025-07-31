"use client";

import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

function ActivityToast() {
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch("/api/apply");
        const data = await response.json();
        setActiveSessions(data.activeSessions || []);
      } catch (error) {
        console.error("Failed to fetch active sessions:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    activeSessions.forEach((session) => {
      toast.info(`Scraping on ${session.platform} is currently active.`, {
        id: session.userId,
        duration: Infinity, // Keep the toast visible until the session ends
      });
    });

    // Optionally, dismiss toasts for sessions that are no longer active
    // This requires comparing with a previous state of activeSessions
  }, [activeSessions]);

  return <Toaster />;
}

export default ActivityToast;
