// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LibAppStorage.sol";
import "./LibAllocationStrategies.sol";

library LibPrize {
    enum State {
        Setup,
        Open,
        Evaluating,
        Allocating,
        Claiming,
        Closed
    }

    enum AllocationStrategy {
        Linear,
        Quadratic,
        WinnerTakesAll,
        Invalid
    }

    event ContributionAdded(address contestant, string description);
    event StateChanged(uint256 indexed prizeId, State oldState, State newState);
    event PrizeCreated(address indexed organizer, uint256 indexed prizeId, string name, uint256 pool);
    event PrizeFunded(uint256 indexed prizeId, address funder, uint256 amount, uint256 newTotal);
    event ContributionAdded(uint256 indexed prizeId, address contestant, string description);
    event ScoreAssigned(uint256 indexed prizeId, address indexed evaluator, address contestant, uint256 scoreCount);
    event EvaluatorsAdded(uint256 indexed prizeId, address[] evaluators);
    event EvaluatorsRemoved(uint256 indexed prizeId, address[] evaluators);
    event RewardsAllocated(uint256 indexed prizeId, uint256 contestantCount);
    event RewardClaimed(uint256 indexed prizeId, address indexed contestant, uint256 amount);
    event AllocationStrategySet(uint256 indexed prizeId, AllocationStrategy strategy);
    event PrizeContractsSet(
        uint256 indexed prizeId,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    );
    event PrizeOrganizerSet(uint256 indexed prizeId, address indexed organizer);
    event PrizeEvaluatorAdded(uint256 indexed prizeId, address indexed evaluator);
    event PrizeEvaluatorRemoved(uint256 indexed prizeId, address indexed evaluator);
    event CriteriaWeightsAssigned(uint256 indexed prizeId, uint16[] weights);
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

    function getPrizeName(uint256 prizeId) internal view returns (string memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].name;
    }

    function getPrizeDescription(uint256 prizeId) internal view returns (string memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].description;
    }

    function getPrizeCriteriaNames(uint256 prizeId) internal view returns (string[] memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].criteriaNames;
    }

    function getPrizeCriteriaWeights(uint256 prizeId) internal view returns (uint16[] memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].criteriaWeights;
    }

    function getPrizeAllocationStrategy(uint256 prizeId) internal view returns (AllocationStrategy) {
        return LibAppStorage.diamondStorage().prizes[prizeId].allocationStrategy;
    }

    function setPrizeAllocationStrategy(uint256 prizeId, AllocationStrategy strategy) internal {
        LibAppStorage.diamondStorage().prizes[prizeId].allocationStrategy = strategy;
    }

    function getAllAllocationStrategies() internal pure returns (AllocationStrategy[] memory) {
        uint256 strategyCount = uint256(type(AllocationStrategy).max) + 1;
        AllocationStrategy[] memory strategies = new AllocationStrategy[](strategyCount);
        for (uint256 i = 0; i < strategyCount; i++) {
            strategies[i] = AllocationStrategy(i);
        }
        return strategies;
    }
}
