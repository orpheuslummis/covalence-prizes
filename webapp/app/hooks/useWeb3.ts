'use client';

import { config } from '@/config';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        ethereum?: any;
    }
}

const isBrowser = typeof window !== 'undefined';

export const useWeb3 = () => {
    const [web3State, setWeb3State] = useState({
        isLoading: true,
        isConnected: false,
        isInitialized: false,
        provider: null,
        contracts: null,
    });

    useEffect(() => {
        const initializeWeb3 = async () => {
            try {
                if (!isBrowser) return;
                if (window.ethereum) {
                    try {
                        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                        if (accounts.length > 0) {
                            const web3Provider = new ethers.BrowserProvider(window.ethereum);
                            setWeb3State({
                                isLoading: false,
                                isConnected: true,
                                isInitialized: true,
                                provider: web3Provider,
                                contracts: {
                                    PrizeManager: {
                                        address: config.contracts?.PrizeManager?.address || '',
                                        abi: config.contracts?.PrizeManager?.abi || [],
                                    },
                                },
                            });
                        }
                    } catch (err) {
                        console.error('Failed to check initial connection:', err);
                    }
                } else {
                    setWeb3State({
                        isLoading: false,
                        isConnected: false,
                        isInitialized: false,
                        provider: null,
                        contracts: null,
                    });
                }
            } catch (error) {
                console.error('Failed to initialize Web3:', error);
                setWeb3State({
                    isLoading: false,
                    isConnected: false,
                    isInitialized: false,
                    provider: null,
                    contracts: null,
                });
            }
        };

        initializeWeb3();
    }, []);

    return web3State;
}