import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Sidebar from '@/components/Sidebar'; // Assuming you create this component

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'GetaJob - Auto Apply Bot',
  description:
    'Automate your job applications on LinkedIn, Bumeran and Zonajobs',
};

// Placeholder for user type
interface User {
  name: string;
  // add other user properties here if needed
}

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    // In a real app, you'd also check if the token is revoked in the DB
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as jwt.JwtPayload;
    // This is a simplified user object. You might want to fetch full user details
    return { name: decoded.email as string }; // Using email as name for now
  } catch (error) {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <div className="flex min-h-screen">
          <Sidebar user={user} />
          <main className="flex-grow p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
