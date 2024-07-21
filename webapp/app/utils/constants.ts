export const PRIZE_CONTRACT_ABI = [
    "function allPrizes(uint256) view returns (address prizeAddress, string description, uint256 totalRewardPool, bool active)",
    "function getPrizeCount() view returns (uint256)",
    "function createPrize(string description, uint256 totalRewardPool, string allocationStrategy, string[] criteriaNames) payable returns (address)",
    "function deactivatePrize(address prizeAddress)"
];

export const NETWORK_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '31337';