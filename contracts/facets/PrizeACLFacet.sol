// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IERC165.sol";
import "../interfaces/IAccessControl.sol";
import "../interfaces/IAccessControlEnumerable.sol";

contract PrizeACLFacet is IERC165, IAccessControl, IAccessControlEnumerable {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant PRIZE_MANAGER_ROLE = keccak256("PRIZE_MANAGER_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE");

    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function initialize(address _admin) external {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(!s.initialized, "ACL: Already initialized");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);

        bytes32[3] memory rolesToSet = [PRIZE_MANAGER_ROLE, ORGANIZER_ROLE, EVALUATOR_ROLE];
        for (uint i = 0; i < 3; i++) {
            _setRoleAdmin(rolesToSet[i], DEFAULT_ADMIN_ROLE);
        }

        s.initialized = true;
    }

    function hasRole(bytes32 role, address account) public view override returns (bool) {
        return LibAppStorage.diamondStorage().roles[role].members.contains(account);
    }

    function getRoleAdmin(bytes32 role) public view override returns (bytes32) {
        return LibAppStorage.diamondStorage().roles[role].adminRole;
    }

    function grantRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) public virtual override {
        require(account == msg.sender, "ACL: can only renounce roles for self");
        _revokeRole(role, account);
    }

    function _checkRole(bytes32 role) internal view {
        _checkRole(role, msg.sender);
    }

    function _checkRole(bytes32 role, address account) internal view {
        if (!hasRole(role, account)) {
            revert(string(abi.encodePacked("ACL: account ", account, " is missing role ", role)));
        }
    }

    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (!hasRole(role, account)) {
            s.roles[role].members.add(account);
            emit RoleGranted(role, account, msg.sender);
            return true;
        }
        return false;
    }

    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (hasRole(role, account)) {
            s.roles[role].members.remove(account);
            emit RoleRevoked(role, account, msg.sender);
            return true;
        }
        return false;
    }

    function setRoleAdmin(bytes32 role, bytes32 adminRole) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRoleAdmin(role, adminRole);
    }

    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        AppStorage storage s = LibAppStorage.diamondStorage();
        bytes32 previousAdminRole = getRoleAdmin(role);
        s.roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    // IAccessControlEnumerable functions
    function getRoleMemberCount(bytes32 role) public view override returns (uint256) {
        return LibAppStorage.diamondStorage().roles[role].members.length();
    }

    function getRoleMember(bytes32 role, uint256 index) public view override returns (address) {
        return LibAppStorage.diamondStorage().roles[role].members.at(index);
    }

    // IERC165 function
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IAccessControlEnumerable).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
