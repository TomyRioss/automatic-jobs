"use client";
import { LogOut, User as UserIconLucide } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserIcon({ user }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.push("/login");
  };

  if (!user) {
    return null;
  }

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="relative group">
      <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold cursor-pointer">
        {getInitials(user.name)}
      </div>
      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
        <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{user.name}</div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
