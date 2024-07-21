import { ethers } from 'ethers';

// Constants
export const PRIZE_CONTRACT_ADDRESS = '0x...';
export const PRIZE_CONTRACT_ABI = [];
export const TOKEN_ADDRESS = '0x...';
export const TESTNET_RPC_URL = process.env.NEXT_PUBLIC_TESTNET_RPC_URL;
export const NETWORK_ID = '31337';

// Helper functions
export function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: string, decimals: number = 18): string {
    return ethers.formatUnits(amount, decimals);
}

export function parseAmount(amount: string, decimals: number = 18): string {
    return ethers.parseUnits(amount, decimals).toString();
}

export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}

export function calculateTimeLeft(deadline: number): { days: number; hours: number; minutes: number; seconds: number } {
    const difference = +new Date(deadline * 1000) - +new Date();
    let timeLeft = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    };

    if (difference > 0) {
        timeLeft = {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60)
        };
    }

    return timeLeft;
}