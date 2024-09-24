import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";
import { createPublicClient } from "viem";
import DiamondABI from "../abi/Diamond.json";
import DiamondCutFacetABI from "../abi/DiamondCutFacet.json";
import DiamondLoupeFacetABI from "../abi/DiamondLoupeFacet.json";
import PrizeACLFacetABI from "../abi/PrizeACLFacet.json";
import PrizeContributionFacetABI from "../abi/PrizeContributionFacet.json";
import PrizeEvaluationFacetABI from "../abi/PrizeEvaluationFacet.json";
import PrizeFundingFacetABI from "../abi/PrizeFundingFacet.json";
import PrizeManagerFacetABI from "../abi/PrizeManagerFacet.json";
import PrizeRewardFacetABI from "../abi/PrizeRewardFacet.json";
import PrizeStateFacetABI from "../abi/PrizeStateFacet.json";
import PrizeStrategyFacetABI from "../abi/PrizeStrategyFacet.json";
import contractAddresses from "../contract-addresses.json";
import { AllocationStrategy } from "./lib/types";

const ENV = {
  TESTNET_RPC_URL: import.meta.env.VITE_TESTNET_RPC_URL || "https://api.helium.fhenix.zone",
  CHAIN_ID: import.meta.env.VITE_CHAIN_ID || "8008135",
  EXPLORER_URL: import.meta.env.VITE_EXPLORER_URL || "https://explorer.helium.fhenix.zone",
  WALLET_CONNECT_PROJECT_ID: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "",
};

export const fhenixTestnet = {
  id: parseInt(ENV.CHAIN_ID, 10),
  name: "Fhenix Testnet",
  network: "fhenix-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Fhenix",
    symbol: "FHE",
  },
  rpcUrls: {
    default: { http: [ENV.TESTNET_RPC_URL] },
    public: { http: [ENV.TESTNET_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: ENV.EXPLORER_URL },
  },
  testnet: true,
} as const;

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Covalence Prize",
    appUrl: "https://prizes.covalence.info",
    walletConnectProjectId: ENV.WALLET_CONNECT_PROJECT_ID,
    chains: [fhenixTestnet],
    transports: {
      [fhenixTestnet.id]: http(ENV.TESTNET_RPC_URL),
    },
  }),
);

export const publicClient = createPublicClient({
  chain: fhenixTestnet,
  transport: http(ENV.TESTNET_RPC_URL),
});

console.log("Fhenix Testnet Chain:", fhenixTestnet);
console.log("Wagmi Config:", wagmiConfig);

const addresses = contractAddresses[ENV.CHAIN_ID as keyof typeof contractAddresses];

if (!addresses) {
  throw new Error(`No contract addresses found for chain ID: ${ENV.CHAIN_ID}`);
}

export const allocationStrategies: { label: string; value: AllocationStrategy }[] = [
  { label: "Linear", value: AllocationStrategy.Linear },
  { label: "Quadratic", value: AllocationStrategy.Quadratic },
  { label: "Invalid", value: AllocationStrategy.Invalid },
];

// Merge all ABIs
const mergedABI = [
  ...DiamondABI,
  ...DiamondCutFacetABI,
  ...DiamondLoupeFacetABI,
  ...PrizeACLFacetABI,
  ...PrizeManagerFacetABI,
  ...PrizeContributionFacetABI,
  ...PrizeRewardFacetABI,
  ...PrizeEvaluationFacetABI,
  ...PrizeStrategyFacetABI,
  ...PrizeFundingFacetABI,
  ...PrizeStateFacetABI,
];

export const config = {
  env: ENV,
  contracts: {
    Diamond: {
      address: addresses.Diamond,
      abi: mergedABI,
    },
  },
  allocationStrategies,
};

export { mergedABI as DiamondMergedABI };
