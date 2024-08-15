// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./LibAppStorage.sol";
import "./LibPrize.sol";

library LibACL {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant ADMIN_ROLE = 0x00;

    function setPrizeOrganizer(uint256 prizeId, address organizer) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.prizes[prizeId].organizer = organizer;
        emit LibPrize.PrizeOrganizerSet(prizeId, organizer);
    }

    function isPrizeOrganizer(uint256 prizeId, address account) internal view returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].organizer == account;
    }

    function addPrizeEvaluator(uint256 prizeId, address evaluator) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.prizes[prizeId].evaluators.add(evaluator);
        emit LibPrize.PrizeEvaluatorAdded(prizeId, evaluator);
    }

    function removePrizeEvaluator(uint256 prizeId, address evaluator) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.prizes[prizeId].evaluators.remove(evaluator);
        emit LibPrize.PrizeEvaluatorRemoved(prizeId, evaluator);
    }

    function isPrizeEvaluator(uint256 prizeId, address account) internal view returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].evaluators.contains(account);
    }

    function getPrizeEvaluatorCount(uint256 prizeId) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].evaluators.length();
    }

    function getPrizeEvaluator(uint256 prizeId, uint256 index) internal view returns (address) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].evaluators.at(index);
    }

    function hasRole(bytes32 role, address account) internal view returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (role == ADMIN_ROLE) {
            return s.roles[role].members.contains(account);
        }
        return false;
    }

    function _grantRole(bytes32 role, address account) internal returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (!hasRole(role, account)) {
            s.roles[role].members.add(account);
            emit LibPrize.RoleGranted(role, account, msg.sender);
            return true;
        }
        return false;
    }

    function _revokeRole(bytes32 role, address account) internal returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (hasRole(role, account)) {
            s.roles[role].members.remove(account);
            emit LibPrize.RoleRevoked(role, account, msg.sender);
            return true;
        }
        return false;
    }

    function checkRole(bytes32 role, address account) internal view {
        if (!hasRole(role, account)) {
            revert(string(abi.encodePacked("ACL: account ", account, " is missing role ", role)));
        }
    }
}
