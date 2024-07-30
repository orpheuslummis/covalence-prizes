import { Address, createPublicClient, defineChain, http, keccak256, toBytes } from 'viem';
import { createConfig } from 'wagmi';
import PrizeContractABI from './abi/PrizeContract.json';
import PrizeManagerABI from './abi/PrizeManager.json';
import contractAddresses from './contract-addresses.json';

const ENV = {
    TESTNET_RPC_URL: process.env.NEXT_PUBLIC_TESTNET_RPC_URL || "https://api.helium.fhenix.zone",
    CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '8008135',
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

// Extract roles from PrizeContractABI
const extractRoles = (abi: any[]) => {
    const roles: Record<string, string> = {};
    abi.forEach(item => {
        if (item.type === 'event' && item.name === 'RoleAdminChanged') {
            item.inputs.forEach((input: any) => {
                if (input.name === 'role' && input.internalType.startsWith('bytes32')) {
                    const roleName = input.internalType.split(' ')[1];
                    roles[roleName] = getRoleHash(roleName);
                }
            });
        }
    });
    return roles;
};

const prizeContractRoles = extractRoles(PrizeContractABI);

export const config = {
    env: ENV,
    contracts: {
        PrizeManager: {
            address: addresses.PrizeManager as Address,
            abi: PrizeManagerABI,
        },
        PrizeContract: {
            abi: PrizeContractABI,
            roles: {
                ...prizeContractRoles,
                // Update these to match the smart contract
                DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
                EVALUATOR_ROLE: keccak256(toBytes("EVALUATOR")),
            }
        },
        AllocationStrategyLinear: {
            address: addresses.AllocationStrategyLinear as Address,
        },
    },
    allocationStrategies: {
        AllocationStrategyLinear: {
            name: 'AllocationStrategyLinear',
            contractName: 'AllocationStrategyLinear',
            address: addresses.AllocationStrategyLinear as Address,
        },
        // Add other strategies here as they are implemented
    },
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