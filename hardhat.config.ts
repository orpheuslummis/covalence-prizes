import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-viem";
import { config as dotenvConfig } from "dotenv";
import "fhenix-hardhat-docker";
import "fhenix-hardhat-plugin";
import "hardhat-deploy";
import { HardhatUserConfig } from "hardhat/config";
import { resolve } from "path";
import { fhenixTestnet } from "./chainConfig";
import "./tasks";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env.local";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that the PRIVATE_KEY is set in your .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      debug: { revertStrings: "debug" }
    }
  },
  defaultNetwork: "testnet",
  networks: {
    testnet: {
      chainId: fhenixTestnet.id,
      url: fhenixTestnet.rpcUrls.default.http[0],
      accounts: [PRIVATE_KEY],
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  etherscan: {
    apiKey: {
      // Is not required by blockscout. Can be any non-empty string
      testnet: "abc"
    },
    customChains: [
      {
        network: "testnet",
        chainId: fhenixTestnet.id,
        urls: {
          apiURL: "https://explorer.helium.fhenix.zone/api",
          browserURL: "https://explorer.helium.fhenix.zone/",
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  },
};

export default config;