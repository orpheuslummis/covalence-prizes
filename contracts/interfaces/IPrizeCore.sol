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

    function getState() external view returns (State);

    function moveToNextState() external;

    function getPrizeDetails()
        external
        view
        returns (
            address organizer,
            string memory name,
            string memory description,
            uint256 monetaryRewardPool,
            State state,
            string[] memory criteriaNames,
            uint32[] memory criteriaWeights,
            uint256 contributionCount,
            IAllocationStrategy allocationStrategy
        );

    function getOrganizer() external view returns (address);

    function getName() external view returns (string memory);

    function getDescription() external view returns (string memory);

    function getMonetaryRewardPool() external view returns (uint256);

    function getCriteriaNames() external view returns (string[] memory);

    function getCriteriaWeights() external view returns (uint32[] memory);

    function getAllocationStrategy() external view returns (IAllocationStrategy);

    function addEvaluators(address[] memory _evaluators) external;

    function removeEvaluators(address[] memory _evaluators) external;

    function isEvaluator(address _account) external view returns (bool);

    function assignCriteriaWeights(uint32[] calldata weights) external;

    function fundPrize() external payable;

    function setAllocationStrategy(address _strategyAddress) external;

    event StateChanged(State oldState, State newState);
    event CriteriaWeightsAssigned(uint32[] weights);
    event PrizeFunded(address indexed funder, uint256 amount, uint256 newTotalPool);
    event EvaluatorsAdded(address[] evaluators);
    event EvaluatorsRemoved(address[] evaluators);
    event AllocationStrategySet(address indexed strategyAddress);
}
