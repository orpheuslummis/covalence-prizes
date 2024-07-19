// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PrizeContract.sol";
import "./StrategyRegistry.sol";

contract PrizeManager is Ownable {
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
        string[] criteriaNames,
        uint32[] criteriaWeights
    );
    event PrizeDeactivated(address indexed organizer, address prizeAddress);
    event StrategyRegistryUpdated(address newRegistryAddress);

    error InvalidTotalRewardPool();
    error EmptyDescription();
    error MismatchedCriteriaAndWeights();
    error InvalidAllocationStrategy();
    error InsufficientFunds();
    error PrizeNotFound();
    error PrizeAlreadyDeactivated();

    constructor(address registryAddress) Ownable(msg.sender) {
        strategyRegistry = StrategyRegistry(registryAddress);
    }

    function validatePrizeInputs(
        string memory description,
        uint256 totalRewardPool,
        string[] memory criteriaNames,
        uint32[] memory criteriaWeights,
        uint256 value
    ) public pure {
        if (totalRewardPool == 0) revert InvalidTotalRewardPool();
        if (bytes(description).length == 0) revert EmptyDescription();
        if (criteriaNames.length != criteriaWeights.length) revert MismatchedCriteriaAndWeights();
        if (value < totalRewardPool) revert InsufficientFunds();
    }

    function getAndValidateStrategy(string memory allocationStrategy) public view returns (address) {
        address allocationStrategyAddress = strategyRegistry.getStrategyAddress(allocationStrategy);
        if (allocationStrategyAddress == address(0)) revert InvalidAllocationStrategy();
        return allocationStrategyAddress;
    }

    function deployPrizeContract(
        string memory description,
        uint256 totalRewardPool,
        address allocationStrategyAddress,
        string[] memory criteriaNames
    ) public payable returns (address) {
        PrizeContract newPrize = new PrizeContract{value: totalRewardPool}(
            msg.sender,
            description,
            totalRewardPool,
            allocationStrategyAddress,
            criteriaNames
        );
        return address(newPrize);
    }

    function createPrize(
        string memory description,
        uint256 totalRewardPool,
        string memory allocationStrategy,
        string[] memory criteriaNames,
        uint32[] memory criteriaWeights
    ) public payable returns (address) {
        validatePrizeInputs(description, totalRewardPool, criteriaNames, criteriaWeights, msg.value);

        address allocationStrategyAddress = getAndValidateStrategy(allocationStrategy);

        address newPrizeAddress = deployPrizeContract(
            description,
            totalRewardPool,
            allocationStrategyAddress,
            criteriaNames
        );

        PrizeContract(newPrizeAddress).assignCriteriaWeights(criteriaWeights);

        allPrizes.push(Prize(newPrizeAddress, description, totalRewardPool, true));
        organizerPrizeIndices[msg.sender].push(allPrizes.length - 1);

        emit PrizeCreated(
            msg.sender,
            newPrizeAddress,
            description,
            totalRewardPool,
            allocationStrategy,
            criteriaNames,
            criteriaWeights
        );

        return newPrizeAddress;
    }

    function deactivatePrize(address prizeAddress) public {
        uint256 prizeIndex = findPrizeIndex(prizeAddress);
        if (prizeIndex == type(uint256).max) revert PrizeNotFound();
        if (!allPrizes[prizeIndex].active) revert PrizeAlreadyDeactivated();

        require(msg.sender == PrizeContract(prizeAddress).organizer(), "Not the organizer");

        allPrizes[prizeIndex].active = false;
        emit PrizeDeactivated(msg.sender, prizeAddress);
    }

    function getPrizesByOrganizer(address organizer) public view returns (Prize[] memory) {
        uint256[] memory indices = organizerPrizeIndices[organizer];
        Prize[] memory organizerPrizes = new Prize[](indices.length);
        for (uint i = 0; i < indices.length; i++) {
            organizerPrizes[i] = allPrizes[indices[i]];
        }
        return organizerPrizes;
    }

    // function getAllActivePrizes() public view returns (Prize[] memory) {
    //     uint256 activeCount = 0;
    //     for (uint i = 0; i < allPrizes.length; i++) {
    //         if (allPrizes[i].active) activeCount++;
    //     }

    //     Prize[] memory activePrizes = new Prize[](activeCount);
    //     uint256 index = 0;
    //     for (uint i = 0; i < allPrizes.length; i++) {
    //         if (allPrizes[i].active) {
    //             activePrizes[index] = allPrizes[i];
    //             index++;
    //         }
    //     }
    //     return activePrizes;
    // }

    // function updateStrategyRegistry(address newRegistryAddress) public onlyOwner {
    //     strategyRegistry = StrategyRegistry(newRegistryAddress);
    //     emit StrategyRegistryUpdated(newRegistryAddress);
    // }

    function findPrizeIndex(address prizeAddress) internal view returns (uint256) {
        for (uint i = 0; i < allPrizes.length; i++) {
            if (allPrizes[i].prizeAddress == prizeAddress) {
                return i;
            }
        }
        return type(uint256).max;
    }
}
