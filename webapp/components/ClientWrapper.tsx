'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConnectKitProvider } from 'connectkit';
import React, { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { WagmiProvider } from 'wagmi';
import { AppProvider } from '../app/AppContext';
import { wagmiConfig } from '../config';
import { ErrorProvider } from '../hooks/useError';
import Footer from "./Footer";
import Navbar from "./Navbar";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10 * 60 * 1000, // 10 minutes
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ErrorProvider>
            <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                    <ConnectKitProvider>
                        <AppProvider>
                            <Navbar />
                            <div className="min-h-screen bg-gradient-to-b from-purple-950 to-purple-800">
                                <main className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Suspense fallback={<div>Loading...</div>}>
                                        {children}
                                    </Suspense>
                                </main>
                            </div>
                            <Footer />
                            <Toaster
                                position="top-right"
                                toastOptions={{
                                    className: 'bg-white text-gray-800 shadow-lg rounded-lg p-4',
                                    duration: 5000,
                                    success: {
                                        iconTheme: {
                                            primary: '#10B981',
                                            secondary: '#ffffff',
                                        },
                                    },
                                    error: {
                                        iconTheme: {
                                            primary: '#EF4444',
                                            secondary: '#ffffff',
                                        },
                                    },
                                }}
                            />
                        </AppProvider>
                    </ConnectKitProvider>
                    <ReactQueryDevtools initialIsOpen={false} />
                </QueryClientProvider>
            </WagmiProvider>
        </ErrorProvider>
    );
};

export default ClientWrapper;