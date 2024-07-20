// Plugins
// Tasks
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import { config as dotenvConfig } from "dotenv";
import "fhenix-hardhat-docker";
import "fhenix-hardhat-plugin";
import "hardhat-deploy";
import { HardhatUserConfig } from "hardhat/config";
import { resolve } from "path";
import "./tasks";

// DOTENV_CONFIG_PATH is used to specify the path to the .env file for example in the CI
const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

const TESTNET_CHAIN_ID = 8008135;
// const TESTNET_RPC_URL = "https://api.testnet.fhenix.zone:7747";
const TESTNET_RPC_URL = "https://api.helium.fhenix.zone";

const testnetConfig: any = {
  chainId: TESTNET_CHAIN_ID,
  url: TESTNET_RPC_URL,
}

// Select either private keys or mnemonic from .env file or environment variables
const keys = process.env.KEY;
if (!keys) {
  let mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("No mnemonic or private key provided, please set MNEMONIC or KEY in your .env file");
  }
  testnetConfig['accounts'] = {
    count: 10,
    mnemonic,
    path: "m/44'/60'/0'/0",
  }
} else {
  testnetConfig['accounts'] = [keys];
}


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      debug: { revertStrings: "debug" }
    }
  },
  // Optional: defaultNetwork is already being set to "localfhenix" by fhenix-hardhat-plugin
  defaultNetwork: "localfhenix",
  networks: {
    // localfhenix: {
    //   gas: "auto",
    //   gasMultiplier: 1.2,
    //   gasPrice: "auto",
    //   timeout: 10_000,
    //   httpHeaders: {},
    //   url: "http://127.0.0.1:42069",
    //   accounts: {
    //     mnemonic:
    //     "demand hotel mass rally sphere tiger measure sick spoon evoke fashion comfort",
    //     path: "m/44'/60'/0'/0",
    //     initialIndex: 0,
    //     count: 20,
    //   },
    // },
    testnet: testnetConfig,
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  // mocha: {
  //   timeout: 40_000
  // },
  // contractSizer: {
  //   alphaSort: true,
  //   disambiguatePaths: false,
  //   runOnCompile: true,
  //   strict: true,
  //   only: [':ERC20$'],
  // }

  // tracer: {
  //   tasks: ["deploy", "task:createPrize"],
  // },
  etherscan: {
    apiKey: {
      // Is not required by blockscout. Can be any non-empty string
      testnet: "abc"
    },
    customChains: [
      {
        network: "testnet",
        chainId: TESTNET_CHAIN_ID,
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