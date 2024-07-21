import { ethers } from 'ethers';

export function isValidAmount(amount: string): boolean {
    try {
        const parsedAmount = ethers.parseUnits(amount, 18);
        return parsedAmount.gt(0);
    } catch {
        return false;
    }
}