import addresses from '../contract-addresses.json';

export function getContractAddress(contractName: string): string {
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
    if (!chainId) {
        throw new Error('Chain ID not defined');
    }
    const chainAddresses = addresses[chainId as keyof typeof addresses];
    if (!chainAddresses) {
        throw new Error(`No addresses found for chain ID ${chainId}`);
    }
    const address = chainAddresses[contractName as keyof typeof chainAddresses];
    if (!address) {
        throw new Error(`Address not found for contract ${contractName} on chain ID ${chainId}`);
    }
    return address;
}