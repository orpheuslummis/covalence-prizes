import { Inter } from "next/font/google";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ClientWrapper from '../components/ClientWrapper';
import ErrorHandler from '../components/ErrorHandler';
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
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
        <ErrorHandler>
          <ClientWrapper>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-b from-purple-950 to-purple-800">
              <main className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
            <Footer />
            <ToastContainer
              position="top-center"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              className="toast-container"
            />
          </ClientWrapper>
        </ErrorHandler>
      </body>
    </html>
  );
}