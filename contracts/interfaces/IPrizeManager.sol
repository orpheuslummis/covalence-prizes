// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IPrizeCore.sol";

interface IPrizeManager {
    struct PrizeParams {
        string name;
        string description;
        uint256 pool;
        string strategy;
        string[] criteria;
    }

    struct PrizeDetails {
        address addr;
        string name;
        string description;
        uint256 pool;
        IPrizeCore.State status;
        IAllocationStrategy allocationStrategy;
        string[] criteriaNames;
        uint256 createdAt;
        address organizer;
    }

    function createPrize(PrizeParams memory params) external returns (address);

    function updateStrategy(string memory strategyName, address strategyAddress) external;

    function getPrizeCount() external view returns (uint256);

    function getPrizeDetails(address prizeAddr) external view returns (PrizeDetails memory);

    function getPrizes() external view returns (PrizeDetails[] memory);

    function setPrizeContracts(
        address prizeAddr,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    ) external;

    event PrizeCreated(address indexed organizer, address indexed prizeAddress, string name, uint256 pool);
    event StrategyUpdated(string name, address indexed strategyAddress);
    event PrizeContractsSet(
        address indexed prizeAddress,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    );
}
