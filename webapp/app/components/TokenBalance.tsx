'use client';

import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';

interface TokenBalanceProps {
    tokenAddress: string;
    walletAddress: string;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({ tokenAddress, walletAddress }) => {
    const [balance, setBalance] = useState<string>('0');

    useEffect(() => {
        const fetchBalance = async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const tokenContract = new ethers.Contract(
                        tokenAddress,
                        ['function balanceOf(address) view returns (uint256)'],
                        provider
                    );
                    const balance = await tokenContract.balanceOf(walletAddress);
                    setBalance(ethers.formatUnits(balance, 18)); // Assuming 18 decimals
                } catch (error) {
                    console.error('Error fetching balance:', error);
                    setBalance('Error');
                }
            }
        };

        fetchBalance();
    }, [tokenAddress, walletAddress]);

    return (
        <div className="mt-4">
            <h2 className="text-xl font-semibold">Token Balance</h2>
            <p>{balance} Tokens</p>
        </div>
    );
};

export default TokenBalance;