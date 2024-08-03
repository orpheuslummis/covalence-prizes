// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "./IAllocationStrategy.sol";

interface IPrizeCore {
    enum State {
        Setup,
        Open,
        Evaluating,
        Rewarding,
        Closed
    }

    function getState(uint256 prizeId) external view returns (State);

    function moveToNextState(uint256 prizeId) external;

    function getOrganizer(uint256 prizeId) external view returns (address);

    function getName(uint256 prizeId) external view returns (string memory);

    function getDescription(uint256 prizeId) external view returns (string memory);

    function getMonetaryRewardPool(uint256 prizeId) external view returns (uint256);

    function getCriteriaNames(uint256 prizeId) external view returns (string[] memory);

    function getCriteriaWeights(uint256 prizeId) external view returns (uint32[] memory);

    function getAllocationStrategy(uint256 prizeId) external view returns (IAllocationStrategy);

    function addEvaluators(uint256 prizeId, address[] memory _evaluators) external;

    function removeEvaluators(uint256 prizeId, address[] memory _evaluators) external;

    function isEvaluator(uint256 prizeId, address _account) external view returns (bool);

    function assignCriteriaWeights(uint256 prizeId, uint32[] calldata weights) external;

    function fundPrize(uint256 prizeId) external payable;

    function setAllocationStrategy(uint256 prizeId, address _strategyAddress) external;

    event StateChanged(uint256 indexed prizeId, State oldState, State newState);
    event CriteriaWeightsAssigned(uint256 indexed prizeId, uint32[] weights);
    event PrizeFunded(uint256 indexed prizeId, address indexed funder, uint256 amount, uint256 newTotalPool);
    event EvaluatorsAdded(uint256 indexed prizeId, address[] evaluators);
    event EvaluatorsRemoved(uint256 indexed prizeId, address[] evaluators);
    event AllocationStrategySet(uint256 indexed prizeId, address indexed strategyAddress);
}
