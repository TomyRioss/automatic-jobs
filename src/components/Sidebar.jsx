"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Settings,
} from "lucide-react";

export default function Sidebar({ user }) {
  const [isScrapingOpen, setScrapingOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("token");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavigation = (path) => {
    router.push(path);
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gray-100 p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-6 flex items-center gap-2">
        <Briefcase className="h-8 w-8 text-cyan-500" />
        <h1 className="text-2xl font-bold">GetaJob</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <button
          onClick={() => handleNavigation("/")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => handleNavigation("/history")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ClipboardList className="h-5 w-5" />
          <span>History</span>
        </button>

        <div>
          <button
            onClick={() => setScrapingOpen(!isScrapingOpen)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5" />
              <span>Scraping</span>
            </div>
            {isScrapingOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
          {isScrapingOpen && (
            <div className="mt-2 space-y-2 pl-8">
              <button
                onClick={() => handleNavigation("/scraping/linkedin")}
                className="w-full text-left text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                LinkedIn
              </button>
              <button
                onClick={() => handleNavigation("/scraping/bumeran")}
                className="w-full text-left text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                Bumeran
              </button>
              <button
                onClick={() => handleNavigation("/scraping/zonajobs")}
                className="w-full text-left text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                ZonaJobs
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => handleNavigation("/settings")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </nav>

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
