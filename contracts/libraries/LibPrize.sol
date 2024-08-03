// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LibAppStorage.sol";
import "../interfaces/IAllocationStrategy.sol";

library LibPrize {
    enum State {
        Setup,
        Open,
        Evaluating,
        Rewarding,
        Closed
    }

    event StateChanged(uint256 indexed prizeId, State oldState, State newState);
    event PrizeCreated(address indexed organizer, uint256 indexed prizeId, string name, uint256 pool);
    event PrizeFunded(uint256 indexed prizeId, address funder, uint256 amount, uint256 newTotal);
    event ContributionAdded(uint256 indexed prizeId, address contestant, string description);
    event ScoresAssigned(
        uint256 indexed prizeId,
        address indexed evaluator,
        address[] contestants,
        uint256[] scoreCounts
    );
    event EvaluatorsAdded(uint256 indexed prizeId, address[] evaluators);
    event EvaluatorsRemoved(uint256 indexed prizeId, address[] evaluators);
    event RewardsAllocated(uint256 indexed prizeId, uint256 contestantCount);
    event RewardClaimed(uint256 indexed prizeId, address indexed contestant, uint256 amount);
    event AllocationStrategySet(uint256 indexed prizeId, address indexed strategyAddress);
    event PrizeContractsSet(
        uint256 indexed prizeId,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    );
    event PrizeOrganizerSet(uint256 indexed prizeId, address indexed organizer);
    event PrizeEvaluatorAdded(uint256 indexed prizeId, address indexed evaluator);
    event PrizeEvaluatorRemoved(uint256 indexed prizeId, address indexed evaluator);
    event CriteriaWeightsAssigned(uint256 indexed prizeId, uint32[] weights);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    function isState(uint256 prizeId, State _state) internal view returns (bool) {
        return LibAppStorage.diamondStorage().prizes[prizeId].state == _state;
    }

    function getPrizeState(uint256 prizeId) internal view returns (State) {
        return LibAppStorage.diamondStorage().prizes[prizeId].state;
    }

    function setPrizeState(uint256 prizeId, State newState) internal {
        LibAppStorage.diamondStorage().prizes[prizeId].state = newState;
    }

    function getPrizeOrganizer(uint256 prizeId) internal view returns (address) {
        return LibAppStorage.diamondStorage().prizes[prizeId].organizer;
    }

    function getPrizeMonetaryRewardPool(uint256 prizeId) internal view returns (uint256) {
        return LibAppStorage.diamondStorage().prizes[prizeId].monetaryRewardPool;
    }

    function getPrizeAllocationStrategy(uint256 prizeId) internal view returns (IAllocationStrategy) {
        return LibAppStorage.diamondStorage().prizes[prizeId].strategy;
    }

    function setPrizeAllocationStrategy(uint256 prizeId, IAllocationStrategy strategy) internal {
        LibAppStorage.diamondStorage().prizes[prizeId].strategy = strategy;
    }

    function getPrizeName(uint256 prizeId) internal view returns (string memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].name;
    }

    function getPrizeDescription(uint256 prizeId) internal view returns (string memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].description;
    }

    function getPrizeCriteriaNames(uint256 prizeId) internal view returns (string[] memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].criteriaNames;
    }

    function getPrizeCriteriaWeights(uint256 prizeId) internal view returns (uint32[] memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].criteriaWeights;
    }
}
