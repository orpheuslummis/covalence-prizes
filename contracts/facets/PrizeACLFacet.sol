// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibACL.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract PrizeACLFacet {
    using EnumerableSet for EnumerableSet.AddressSet;

    function getAdminRole() public pure returns (bytes32) {
        return LibACL.ADMIN_ROLE;
    }

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

    function setPrizeOrganizer(uint256 prizeId, address organizer) external onlyDefaultAdmin {
        LibACL.setPrizeOrganizer(prizeId, organizer);
    }

    function addPrizeEvaluator(uint256 prizeId, address evaluator) external onlyPrizeOrganizer(prizeId) {
        LibACL.addPrizeEvaluator(prizeId, evaluator);
    }

    function removePrizeEvaluator(uint256 prizeId, address evaluator) external onlyPrizeOrganizer(prizeId) {
        LibACL.removePrizeEvaluator(prizeId, evaluator);
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

    function getPrizeEvaluator(uint256 prizeId, uint256 index) public view returns (address) {
        return LibACL.getPrizeEvaluator(prizeId, index);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return LibACL.hasRole(role, account);
    }

    function grantRole(bytes32 role, address account) public virtual onlyDefaultAdmin {
        require(role == LibACL.ADMIN_ROLE, "Only ADMIN_ROLE can grant roles");
        LibACL._grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual onlyDefaultAdmin {
        require(role == LibACL.ADMIN_ROLE, "Only ADMIN_ROLE can revoke roles");
        LibACL._revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) public virtual {
        require(account == msg.sender, "ACL: can only renounce roles for self");
        LibACL._revokeRole(role, account);
    }
}
