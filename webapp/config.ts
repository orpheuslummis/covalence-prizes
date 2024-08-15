import { Address, createPublicClient, defineChain, http, keccak256, toBytes } from 'viem';
import { createConfig } from 'wagmi';
import DiamondABI from './abi/Diamond.json';
import DiamondCutFacetABI from './abi/DiamondCutFacet.json';
import DiamondLoupeFacetABI from './abi/DiamondLoupeFacet.json';
import PrizeACLFacetABI from './abi/PrizeACLFacet.json';
import PrizeContributionFacetABI from './abi/PrizeContributionFacet.json';
import PrizeEvaluationFacetABI from './abi/PrizeEvaluationFacet.json';
import PrizeFundingFacetABI from './abi/PrizeFundingFacet.json';
import PrizeManagerFacetABI from './abi/PrizeManagerFacet.json';
import PrizeRewardFacetABI from './abi/PrizeRewardFacet.json';
import PrizeStateFacetABI from './abi/PrizeStateFacet.json';
import PrizeStrategyFacetABI from './abi/PrizeStrategyFacet.json';
import contractAddresses from './contract-addresses.json';
import { AllocationStrategy } from './types';

const ENV = {
    TESTNET_RPC_URL: process.env.NEXT_PUBLIC_TESTNET_RPC_URL || "https://api.helium.fhenix.zone",
    CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '8008135',
    EXPLORER_URL: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.helium.fhenix.zone",
};

Object.entries(ENV).forEach(([key, value]) => {
    if (!value) {
        console.error(`Missing required environment variable: ${key}`);
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

export const TESTNET_CHAIN_ID = 8008135;
export const TESTNET_RPC_URL = ENV.TESTNET_RPC_URL;

export const fhenixTestnet = defineChain({
    id: TESTNET_CHAIN_ID,
    name: 'Fhenix Testnet',
    network: 'fhenix-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Fhenix',
        symbol: 'FHE',
    },
    rpcUrls: {
        default: { http: [TESTNET_RPC_URL] },
        public: { http: [TESTNET_RPC_URL] },
    },
});

export const publicClient = createPublicClient({
    chain: fhenixTestnet,
    transport: http(TESTNET_RPC_URL)
});

export const wagmiConfig = createConfig({
    chains: [fhenixTestnet],
    transports: {
        [fhenixTestnet.id]: http(TESTNET_RPC_URL),
    },
});

const chainId = ENV.CHAIN_ID;
const addresses = contractAddresses[chainId as keyof typeof contractAddresses];

if (!addresses) {
    throw new Error(`No contract addresses found for chain ID: ${chainId}`);
}

// Function to generate role hash
const getRoleHash = (role: string) => keccak256(toBytes(role));

export const allocationStrategies: Record<AllocationStrategy, { name: string; description: string }> = {
    [AllocationStrategy.Linear]: {
        name: 'Linear',
        description: 'Rewards are distributed linearly based on scores.'
    },
    [AllocationStrategy.Quadratic]: {
        name: 'Quadratic',
        description: 'Rewards are distributed quadratically, emphasizing higher scores.'
    },
    [AllocationStrategy.Invalid]: {
        name: 'Invalid',
        description: 'An invalid or unspecified allocation strategy.'
    }
};

export const config = {
    env: ENV,
    contracts: {
        Diamond: {
            address: addresses.Diamond as Address,
            abi: DiamondABI,
        },
        DiamondCutFacet: {
            address: addresses.DiamondCutFacet as Address,
            abi: DiamondCutFacetABI,
        },
        DiamondLoupeFacet: {
            address: addresses.DiamondLoupeFacet as Address,
            abi: DiamondLoupeFacetABI,
        },
        PrizeACLFacet: {
            address: addresses.PrizeACLFacet as Address,
            abi: PrizeACLFacetABI,
        },
        PrizeManagerFacet: {
            address: addresses.PrizeManagerFacet as Address,
            abi: PrizeManagerFacetABI,
        },
        PrizeContributionFacet: {
            address: addresses.PrizeContributionFacet as Address,
            abi: PrizeContributionFacetABI,
        },
        PrizeRewardFacet: {
            address: addresses.PrizeRewardFacet as Address,
            abi: PrizeRewardFacetABI,
        },
        PrizeEvaluationFacet: {
            address: addresses.PrizeEvaluationFacet as Address,
            abi: PrizeEvaluationFacetABI,
        },
        PrizeStrategyFacet: {
            address: addresses.PrizeStrategyFacet as Address,
            abi: PrizeStrategyFacetABI,
        },
        PrizeFundingFacet: {
            address: addresses.PrizeFundingFacet as Address,
            abi: PrizeFundingFacetABI,
        },
        PrizeStateFacet: {
            address: addresses.PrizeStateFacet as Address,
            abi: PrizeStateFacetABI,
        },
    },
    roles: {
        ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
        EVALUATOR_ROLE: getRoleHash("EVALUATOR"),
    },
    allocationStrategies,
};

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
        const amountInWei = BigInt(Math.floor(parsedAmount * 1e18));
        return amountInWei > 0n;
    } catch {
        return false;
    }
};