'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import React from 'react';
import { ToastContainer } from 'react-toastify';
import { WagmiProvider } from 'wagmi';
import { AppProvider } from '../app/AppContextProvider';
import { fhenixTestnet, wagmiConfig } from '../config';
import ErrorHandler from './ErrorHandler';
import Footer from "./Footer";
import Navbar from "./Navbar";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ErrorHandler>
            <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                    <ConnectKitProvider options={{ initialChainId: fhenixTestnet.id }}>
                        <AppProvider>
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
                        </AppProvider>
                    </ConnectKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </ErrorHandler>
    );
};

export default ClientWrapper;