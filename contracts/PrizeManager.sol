// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "./PrizeContract.sol";
import "./StrategyRegistry.sol";

contract PrizeManager {
    struct Prize {
        address prizeAddress;
        string description;
        uint256 totalRewardPool;
        bool active;
    }

    StrategyRegistry public strategyRegistry;
    Prize[] public allPrizes;
    mapping(address => uint256[]) public organizerPrizeIndices;

    event PrizeCreated(
        address indexed organizer,
        address prizeAddress,
        string description,
        uint256 totalRewardPool,
        string allocationStrategy,
        string[] criteriaNames
    );
    event PrizeDeactivated(address indexed organizer, address prizeAddress);
    event StrategyAddressRetrieved(string allocationStrategy, address strategyAddress);

    error InvalidInput();
    error InvalidAllocationStrategy();
    error PrizeNotFound();
    error Unauthorized();

    constructor(address registryAddress) {
        strategyRegistry = StrategyRegistry(registryAddress);
    }

    function createPrize(
        string memory description,
        uint256 totalRewardPool,
        string memory allocationStrategy,
        string[] memory criteriaNames
    ) public payable returns (address) {
        if (totalRewardPool == 0 || bytes(description).length == 0 || msg.value < totalRewardPool) {
            revert InvalidInput();
        }

        address strategyAddress = strategyRegistry.getStrategyAddress(allocationStrategy);
        if (strategyAddress == address(0)) revert InvalidAllocationStrategy();
        emit StrategyAddressRetrieved(allocationStrategy, strategyAddress);

        PrizeContract newPrize = new PrizeContract{value: totalRewardPool}(
            msg.sender,
            description,
            totalRewardPool,
            strategyAddress,
            criteriaNames
        );
        address newPrizeAddress = address(newPrize);

        allPrizes.push(Prize(newPrizeAddress, description, totalRewardPool, true));
        organizerPrizeIndices[msg.sender].push(allPrizes.length - 1);

        emit PrizeCreated(msg.sender, newPrizeAddress, description, totalRewardPool, allocationStrategy, criteriaNames);
        return newPrizeAddress;
    }

    function deactivatePrize(address prizeAddress) public {
        uint256 prizeIndex = findPrizeIndex(prizeAddress);
        if (!allPrizes[prizeIndex].active || msg.sender != PrizeContract(prizeAddress).organizer()) {
            revert Unauthorized();
        }

        allPrizes[prizeIndex].active = false;
        emit PrizeDeactivated(msg.sender, prizeAddress);
    }

    function findPrizeIndex(address prizeAddress) internal view returns (uint256) {
        for (uint i = 0; i < allPrizes.length; i++) {
            if (allPrizes[i].prizeAddress == prizeAddress) {
                return i;
            }
        }
        revert PrizeNotFound();
    }
}
