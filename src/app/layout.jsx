import { Inter } from "next/font/google";

import Sidebar from "@/components/Sidebar";
import UserIcon from "@/components/UserIcon";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GetaJob - Auto Apply Bot",
  description: "Automate your job applications on LinkedIn, Bumeran and Zonajobs",
};

export default async function RootLayout({ children }) {
  const user = { name: "Demo User" };

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900">
          {user && <Sidebar user={user} />}
          <div className="flex flex-1 flex-col">
            <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:border-gray-800 dark:bg-gray-950">
              <div />
              {user && <UserIcon user={user} />}
            </header>
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
