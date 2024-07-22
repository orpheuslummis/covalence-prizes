import { Inter } from "next/font/google";
import ClientWrapper from './components/ClientWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Navbar from './components/Navbar';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <ClientWrapper>
            <Navbar />
            <Layout>{children}</Layout>
          </ClientWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}