interface EnvConfig {
    [key: string]: string;
}

const ENV_CONFIG: EnvConfig = {
    NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS || '',
    NEXT_PUBLIC_TESTNET_RPC_URL: process.env.NEXT_PUBLIC_TESTNET_RPC_URL || '',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '',
};

console.log('ENV_CONFIG:', ENV_CONFIG);
console.log('NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS:', process.env.NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS);

export const getEnv = (key: keyof typeof ENV_CONFIG): string => {
    return process.env[key] || ENV_CONFIG[key];
};

export const validateEnv = (): void => {
    const requiredEnvVars = [
        'NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS',
        'NEXT_PUBLIC_CHAIN_ID',
        'NEXT_PUBLIC_TESTNET_RPC_URL',
    ];

    console.log('Process env:', process.env);

    for (const envVar of requiredEnvVars) {
        console.log(`Checking ${envVar}: ${process.env[envVar]}`);
        if (!process.env[envVar]) {
            console.error(`Missing required environment variable: ${envVar}`);
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
};

// Export individual environment variables
export const NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS = getEnv('NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS');
export const NEXT_PUBLIC_TESTNET_RPC_URL = getEnv('NEXT_PUBLIC_TESTNET_RPC_URL');
export const NEXT_PUBLIC_CHAIN_ID = getEnv('NEXT_PUBLIC_CHAIN_ID');