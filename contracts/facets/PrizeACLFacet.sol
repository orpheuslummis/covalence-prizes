// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../libraries/LibAppStorage.sol";

contract PrizeACLFacet {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    struct PrizeRoles {
        address organizer;
        EnumerableSet.AddressSet evaluators;
    }

    mapping(uint256 => PrizeRoles) private prizeRoles;

    modifier onlyDefaultAdmin() {
        _checkRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _;
    }

    modifier onlyPrizeOrganizer(uint256 prizeId) {
        require(msg.sender == prizeRoles[prizeId].organizer, "Only prize organizer can perform this action");
        _;
    }

    modifier onlyPrizeEvaluator(uint256 prizeId) {
        require(prizeRoles[prizeId].evaluators.contains(msg.sender), "Only prize evaluator can perform this action");
        _;
    }

    function initializePrizeACL(address _admin) external {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(!s.initialized, "PrizeACL: Already initialized");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);

        s.initialized = true;
    }

    function setPrizeOrganizer(uint256 prizeId, address organizer) external onlyDefaultAdmin {
        prizeRoles[prizeId].organizer = organizer;
        emit LibPrize.PrizeOrganizerSet(prizeId, organizer);
    }

    function addPrizeEvaluator(uint256 prizeId, address evaluator) external onlyPrizeOrganizer(prizeId) {
        prizeRoles[prizeId].evaluators.add(evaluator);
        emit LibPrize.PrizeEvaluatorAdded(prizeId, evaluator);
    }

    function removePrizeEvaluator(uint256 prizeId, address evaluator) external onlyPrizeOrganizer(prizeId) {
        prizeRoles[prizeId].evaluators.remove(evaluator);
        emit LibPrize.PrizeEvaluatorRemoved(prizeId, evaluator);
    }

    function isPrizeOrganizer(uint256 prizeId, address account) public view returns (bool) {
        return prizeRoles[prizeId].organizer == account;
    }

    function isPrizeEvaluator(uint256 prizeId, address account) public view returns (bool) {
        return prizeRoles[prizeId].evaluators.contains(account);
    }

    function getPrizeEvaluatorCount(uint256 prizeId) public view returns (uint256) {
        return prizeRoles[prizeId].evaluators.length();
    }

    function getPrizeEvaluator(uint256 prizeId, uint256 index) public view returns (address) {
        return prizeRoles[prizeId].evaluators.at(index);
    }

    function getRoleMember(bytes32 role, uint256 index) public view returns (address) {
        require(role == DEFAULT_ADMIN_ROLE, "Only DEFAULT_ADMIN_ROLE is supported");
        return LibAppStorage.diamondStorage().roles[role].members.at(index);
    }

    function getRoleMemberCount(bytes32 role) public view returns (uint256) {
        require(role == DEFAULT_ADMIN_ROLE, "Only DEFAULT_ADMIN_ROLE is supported");
        return LibAppStorage.diamondStorage().roles[role].members.length();
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        if (role == DEFAULT_ADMIN_ROLE) {
            return LibAppStorage.diamondStorage().roles[role].members.contains(account);
        }
        return false;
    }

    function getRoleAdmin() public pure returns (bytes32) {
        return DEFAULT_ADMIN_ROLE;
    }

    function grantRole(bytes32 role, address account) public virtual onlyDefaultAdmin {
        require(role == DEFAULT_ADMIN_ROLE, "Can only grant DEFAULT_ADMIN_ROLE");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual onlyDefaultAdmin {
        require(role == DEFAULT_ADMIN_ROLE, "Can only revoke DEFAULT_ADMIN_ROLE");
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) public virtual {
        require(account == msg.sender, "ACL: can only renounce roles for self");
        _revokeRole(role, account);
    }

    // Internal functions

    function _checkRole(bytes32 role, address account) internal view {
        if (!hasRole(role, account)) {
            revert(string(abi.encodePacked("ACL: account ", account, " is missing role ", role)));
        }
    }

    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (!hasRole(role, account)) {
            s.roles[role].members.add(account);
            emit LibPrize.RoleGranted(role, account, msg.sender);
            return true;
        }
        return false;
    }

    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (hasRole(role, account)) {
            s.roles[role].members.remove(account);
            emit LibPrize.RoleRevoked(role, account, msg.sender);
            return true;
        }
        return false;
    }
}
