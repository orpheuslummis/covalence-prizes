import { defineChain } from "viem";

export const TESTNET_CHAIN_ID = 8008148;
export const TESTNET_RPC_URL = "https://api.nitrogen.fhenix.zone";

export const fhenixTestnet = defineChain({
    id: TESTNET_CHAIN_ID,
    name: "Fhenix Testnet",
    network: "fhenix-testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Fhenix",
        symbol: "FHE",
    },
    rpcUrls: {
        default: { http: [TESTNET_RPC_URL] },
        public: { http: [TESTNET_RPC_URL] },
    },
});
