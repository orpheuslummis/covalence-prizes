'use client';

import React from 'react';
import { useAppContext } from '../AppContext';
import { shortenAddress } from '../utils';

const ConnectWallet: React.FC = () => {
    const { web3 } = useAppContext();
    const { connect, disconnect, isConnected, address } = web3;

    return (
        <div>
            {!isConnected ? (
                <button
                    onClick={connect}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition duration-300 ease-in-out"
                >
                    Connect Wallet
                </button>
            ) : (
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-200">{shortenAddress(address!)}</span>
                    <button
                        onClick={disconnect}
                        className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition duration-300 ease-in-out"
                    >
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConnectWallet;