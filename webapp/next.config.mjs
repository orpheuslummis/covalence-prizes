/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS,
    NEXT_PUBLIC_TESTNET_RPC_URL: process.env.NEXT_PUBLIC_TESTNET_RPC_URL,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  },
};

console.log('Next.js Config:', nextConfig);

export default nextConfig;