// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibACL.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract PrizeACLFacet {
    using EnumerableSet for EnumerableSet.AddressSet;

    modifier onlyDefaultAdmin() {
        LibACL.checkRole(LibACL.ADMIN_ROLE, msg.sender);
        _;
    }

    modifier onlyPrizeOrganizer(uint256 prizeId) {
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Only prize organizer can perform this action");
        _;
    }

    modifier onlyPrizeEvaluator(uint256 prizeId) {
        require(LibACL.isPrizeEvaluator(prizeId, msg.sender), "Only prize evaluator can perform this action");
        _;
    }

    function addPrizeEvaluator(uint256 prizeId, address evaluator) external onlyPrizeOrganizer(prizeId) {
        LibACL.addPrizeEvaluator(prizeId, evaluator);
    }

    function addEvaluators(uint256 prizeId, address[] memory _evaluators) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Setup) || LibPrize.isState(prizeId, LibPrize.State.Open), "Invalid state");
        require(isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        for (uint256 i = 0; i < _evaluators.length; i++) {
            LibACL.addPrizeEvaluator(prizeId, _evaluators[i]);
        }
        emit LibPrize.EvaluatorsAdded(prizeId, _evaluators);
    }

    function isEvaluator(uint256 prizeId, address evaluator) external view returns (bool) {
        return LibACL.isPrizeEvaluator(prizeId, evaluator);
    }

    function removePrizeEvaluator(uint256 prizeId, address evaluator) external onlyPrizeOrganizer(prizeId) {
        LibACL.removePrizeEvaluator(prizeId, evaluator);
    }

    function removeEvaluators(uint256 prizeId, address[] memory _evaluators) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Setup), "Invalid state");
        require(isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        for (uint256 i = 0; i < _evaluators.length; i++) {
            LibACL.removePrizeEvaluator(prizeId, _evaluators[i]);
        }
        emit LibPrize.EvaluatorsRemoved(prizeId, _evaluators);
    }

    function isPrizeOrganizer(uint256 prizeId, address account) public view returns (bool) {
        return LibACL.isPrizeOrganizer(prizeId, account);
    }

    function isPrizeEvaluator(uint256 prizeId, address account) public view returns (bool) {
        return LibACL.isPrizeEvaluator(prizeId, account);
    }

    function getPrizeEvaluatorCount(uint256 prizeId) public view returns (uint256) {
        return LibACL.getPrizeEvaluatorCount(prizeId);
    }

    function getPrizeEvaluators(uint256 prizeId) external view returns (address[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        uint256 evaluatorCount = prize.evaluators.length();
        address[] memory evaluators = new address[](evaluatorCount);
        for (uint256 i = 0; i < evaluatorCount; i++) {
            evaluators[i] = prize.evaluators.at(i);
        }
        return evaluators;
    }
}
