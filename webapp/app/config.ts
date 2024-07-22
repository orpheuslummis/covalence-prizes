import { ethers } from 'ethers';
import addresses from '../contract-addresses.json';
import PrizeManagerABI from './abi/PrizeManager.json';

// Environment variables
const ENV = {
    PRIZE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS,
    TESTNET_RPC_URL: process.env.NEXT_PUBLIC_TESTNET_RPC_URL,
    CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '31337',
};

// Validate environment variables
Object.entries(ENV).forEach(([key, value]) => {
    if (!value) {
        console.error(`Missing required environment variable: ${key}`);
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

// Contract addresses
const getContractAddress = (contractName: string): string => {
    const chainAddresses = addresses[ENV.CHAIN_ID as keyof typeof addresses] || {};
    const address = chainAddresses[contractName as keyof typeof chainAddresses];
    if (!address) {
        throw new Error(`Contract address not found for ${contractName} on chain ${ENV.CHAIN_ID}`);
    }
    return address;
};

// Configuration object
export const config = {
    env: ENV,
    contracts: {
        PrizeManager: {
            address: getContractAddress('PrizeManager'),
            abi: PrizeManagerABI,
        },
        StrategyRegistry: {
            address: getContractAddress('StrategyRegistry'),
        },
        AllocationStrategyLinear: {
            address: getContractAddress('AllocationStrategyLinear'),
        },
    },
    provider: new ethers.JsonRpcProvider(ENV.TESTNET_RPC_URL),
};

// Utility functions
export const shortenAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const isValidAmount = (amount: string): boolean => {
    try {
        const parsedAmount = ethers.parseUnits(amount, 18);
        return parsedAmount > 0;
    } catch {
        return false;
    }
};