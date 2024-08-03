// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IPrizeCore.sol";
import "../interfaces/IAllocationStrategy.sol";
import "./PrizeACLFacet.sol";

contract PrizeCoreFacet is IPrizeCore {
    function getState(uint256 prizeId) external view override returns (State) {
        return LibAppStorage.diamondStorage().prizes[prizeId].state;
    }

    function moveToNextState(uint256 prizeId) external override {
        require(
            PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller does not have the required role"
        );
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];
        State newState;

        if (prize.state == State.Setup) newState = State.Open;
        else if (prize.state == State.Open) newState = State.Evaluating;
        else if (prize.state == State.Evaluating) newState = State.Rewarding;
        else if (prize.state == State.Rewarding) newState = State.Closed;
        else revert("Cannot move to next state");

        State oldState = prize.state;
        prize.state = newState;
        emit StateChanged(prizeId, oldState, newState);
    }

    function getOrganizer(uint256 prizeId) external view override returns (address) {
        return LibAppStorage.diamondStorage().prizes[prizeId].organizer;
    }

    function getName(uint256 prizeId) external view override returns (string memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].name;
    }

    function getDescription(uint256 prizeId) external view override returns (string memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].description;
    }

    function getMonetaryRewardPool(uint256 prizeId) external view override returns (uint256) {
        return LibAppStorage.diamondStorage().prizes[prizeId].monetaryRewardPool;
    }

    function getCriteriaNames(uint256 prizeId) external view override returns (string[] memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].criteriaNames;
    }

    function getCriteriaWeights(uint256 prizeId) external view override returns (uint32[] memory) {
        return LibAppStorage.diamondStorage().prizes[prizeId].criteriaWeights;
    }

    function getAllocationStrategy(uint256 prizeId) external view override returns (IAllocationStrategy) {
        return LibAppStorage.diamondStorage().prizes[prizeId].strategy;
    }

    function addEvaluators(uint256 prizeId, address[] memory _evaluators) external override {
        require(
            PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller does not have the required role"
        );
        for (uint256 i = 0; i < _evaluators.length; i++) {
            PrizeACLFacet(address(this)).grantRole(PrizeACLFacet(address(this)).EVALUATOR_ROLE(), _evaluators[i]);
        }
        emit EvaluatorsAdded(prizeId, _evaluators);
    }

    function removeEvaluators(uint256 prizeId, address[] memory _evaluators) external override {
        require(
            PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller does not have the required role"
        );
        for (uint256 i = 0; i < _evaluators.length; i++) {
            PrizeACLFacet(address(this)).revokeRole(PrizeACLFacet(address(this)).EVALUATOR_ROLE(), _evaluators[i]);
        }
        emit EvaluatorsRemoved(prizeId, _evaluators);
    }

    function isEvaluator(uint256 prizeId, address _account) external view override returns (bool) {
        return PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).EVALUATOR_ROLE(), _account);
    }

    function assignCriteriaWeights(uint256 prizeId, uint32[] calldata weights) external override {
        require(
            PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller does not have the required role"
        );
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];
        require(prize.state == State.Setup, "Can only assign weights during setup");
        require(weights.length == prize.criteriaNames.length, "Mismatch in number of weights");

        prize.criteriaWeights = weights;
        emit CriteriaWeightsAssigned(prizeId, weights);
    }

    function fundPrize(uint256 prizeId) external payable override {
        require(
            PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller does not have the required role"
        );
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];
        require(msg.value > 0, "Must send a positive amount");
        require(prize.state == State.Setup, "Can only fund during setup");

        prize.monetaryRewardPool += msg.value;
        if (prize.state == State.Setup) {
            prize.state = State.Open;
            emit StateChanged(prizeId, State.Setup, State.Open);
        }
        emit PrizeFunded(prizeId, msg.sender, msg.value, prize.monetaryRewardPool);
    }

    function setAllocationStrategy(uint256 prizeId, address _strategyAddress) external override {
        require(
            PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller does not have the required role"
        );
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];
        prize.strategy = IAllocationStrategy(_strategyAddress);
        emit AllocationStrategySet(prizeId, _strategyAddress);
    }
}
