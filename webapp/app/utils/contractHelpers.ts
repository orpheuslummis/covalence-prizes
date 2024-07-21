import { ethers } from 'ethers';

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