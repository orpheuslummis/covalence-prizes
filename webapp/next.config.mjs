/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS,
    NEXT_PUBLIC_TESTNET_RPC_URL: process.env.NEXT_PUBLIC_TESTNET_RPC_URL,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_PRIZE_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_PRIZE_MANAGER_ADDRESS,
  },
  webpack: (config, { isServer }) => {
    patchWasmModuleImport(config, isServer);

    if (!isServer) {
      config.output.environment = { ...config.output.environment, asyncFunction: true };
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },
};

function patchWasmModuleImport(config, isServer) {
  config.experiments = Object.assign(config.experiments || {}, {
    asyncWebAssembly: true,
    layers: true,
    topLevelAwait: true
  });

  config.optimization.moduleIds = 'named';

  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
  });

  // TODO: improve this function -> track https://github.com/vercel/next.js/issues/25852
  if (isServer) {
    config.output.webassemblyModuleFilename = './../static/wasm/tfhe_bg.wasm';
  } else {
    config.output.webassemblyModuleFilename = 'static/wasm/tfhe_bg.wasm';
  }
}

export default nextConfig;