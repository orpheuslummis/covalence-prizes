'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import React, { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { AppProvider } from '../app/AppContextProvider';
import { fhenixTestnet, wagmiConfig } from '../config';

const queryClient = new QueryClient();

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return null;
    }

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <ConnectKitProvider
                    options={{
                        initialChainId: fhenixTestnet.id
                    }}
                >
                    <AppProvider>{children}</AppProvider>
                </ConnectKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};

export default ClientWrapper;