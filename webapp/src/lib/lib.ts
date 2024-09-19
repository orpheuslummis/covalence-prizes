import { parseEther } from "viem";

export const shortenAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const isValidAmount = (amount: string): boolean => {
  try {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return false;
    }
    // Convert to wei (smallest unit) to check if it's a valid amount
    const amountInWei = parseEther(amount);
    return amountInWei > 0n;
  } catch {
    return false;
  }
};

export const formatDate = (timestamp: number | bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
};

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
};

export const formatEtherAmount = (amount: bigint): string => {
  const etherAmount = Number(amount) / 1e18;
  return etherAmount.toFixed(6) + " ETH";
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> => {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      await sleep(delay);
    }
  }
  throw lastError;
};
