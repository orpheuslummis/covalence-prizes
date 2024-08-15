import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
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

const PRIVATE_KEYS = [
  process.env.PRIVATE_KEY,
  process.env.PRIVATE_KEY_1,
  process.env.PRIVATE_KEY_2,
  process.env.PRIVATE_KEY_3,
  process.env.PRIVATE_KEY_4,
  process.env.PRIVATE_KEY_5
].filter((key): key is string => typeof key === 'string');

if (PRIVATE_KEYS.length === 0) {
  throw new Error("Please set at least one PRIVATE_KEY in your .env.local file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // debug: { revertStrings: "debug" }
    }
  },
  defaultNetwork: "testnet",
  networks: {
    testnet: {
      chainId: fhenixTestnet.id,
      url: fhenixTestnet.rpcUrls.default.http[0],
      accounts: PRIVATE_KEYS,
    }
  },
  namedAccounts: {
    deployer: 0,
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  etherscan: {
    apiKey: {
      testnet: "abc"
    },
    customChains: [
      {
        network: "testnet",
        chainId: 412346,
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
  mocha: {
    reporter: "spec",
    timeout: 300000 // 5 minutes
  }
};

export default config;