// src/app/page.jsx
"use client";

import ScrapingForm from "@/components/scraping/ScrapingForm";
import Terminal from "@/components/terminal/Terminal";
import { useState } from "react";

export default function HomePage() {
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Start New Scraping Session</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <ScrapingForm addLog={addLog} />
        </div>
        <div>
          <Terminal logs={logs} />
        </div>
      </div>
    </div>
  );
}
