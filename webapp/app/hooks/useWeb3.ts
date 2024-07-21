import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';

export function useWeb3() {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [chainId, setChainId] = useState<number | null>(null);

    const connect = useCallback(async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(web3Provider);
                const accounts = await web3Provider.listAccounts();
                if (accounts.length > 0) {
                    setAddress(accounts[0].address);
                    setIsConnected(true);
                }
                const network = await web3Provider.getNetwork();
                setChainId(Number(network.chainId));
            } catch (err) {
                if (err instanceof Error) {
                    if (err.message.includes('User rejected')) {
                        console.error('User rejected the connection request');
                    } else if (err.message.includes('Unsupported chain')) {
                        console.error('Unsupported network. Please switch to the correct network.');
                    } else {
                        console.error('Failed to connect:', err.message);
                    }
                } else {
                    console.error('An unknown error occurred while connecting');
                }
            }
        } else {
            console.error('Ethereum object not found. Please install MetaMask or use a Web3-enabled browser.');
        }
    }, []);

    const disconnect = useCallback(() => {
        setProvider(null);
        setAddress(null);
        setIsConnected(false);
        setChainId(null);
    }, []);

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                    setIsConnected(true);
                } else {
                    disconnect();
                }
            });
            window.ethereum.on('chainChanged', (newChainId: string) => {
                setChainId(Number(newChainId));
            });
            window.ethereum.on('disconnect', disconnect);
        }

        return () => {
            if (window.ethereum && window.ethereum.removeListener) {
                window.ethereum.removeListener('accountsChanged', () => { });
                window.ethereum.removeListener('chainChanged', () => { });
                window.ethereum.removeListener('disconnect', () => { });
            }
        };
    }, [disconnect]);

    return { provider, address, isConnected, chainId, connect, disconnect };
}