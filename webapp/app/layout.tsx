'use client';

import { Inter } from "next/font/google";
import { AppProvider } from './AppContext';
import Layout from './components/Layout';
import "./globals.css";
import { validateEnv } from './utils/env';

console.log('Environment variables:', process.env);
validateEnv();

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          <Layout>
            {children}
          </Layout>
        </AppProvider>
      </body>
    </html>
  );
}