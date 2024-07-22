'use client';

import React from 'react';
import { useAppContext } from '../AppContext';
import { shortenAddress } from '../utils/contractHelpers';

const ConnectWallet: React.FC = () => {
    const { web3 } = useAppContext();
    const { connect, disconnect, isConnected, address } = web3;

    const handleConnect = async () => {
        try {
            await connect();
        } catch (error) {
            console.error('Failed to connect:', error);
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnect();
        } catch (error) {
            console.error('Failed to disconnect:', error);
        }
    };

    return (
        <div className="flex items-center space-x-4">
            {!isConnected ? (
                <button
                    onClick={handleConnect}
                    className="py-2 px-6 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                >
                    Connect Wallet
                </button>
            ) : (
                <>
                    <span className="text-sm text-purple-200">Connected: {shortenAddress(address!)}</span>
                    <button
                        onClick={handleDisconnect}
                        className="py-2 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Disconnect
                    </button>
                </>
            )}
        </div>
    );
};

export default ConnectWallet;