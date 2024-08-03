// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import {IAllocationStrategy} from "../interfaces/IAllocationStrategy.sol";
import {IPrizeCore} from "../interfaces/IPrizeCore.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

struct AppStorage {
    mapping(uint256 => PrizeInfo) prizes;
    uint256 prizeCount;
    mapping(uint256 => PrizeContributions) prizeContributions;
    mapping(bytes32 => RoleData) roles;
    bool initialized;
    IPrizeCore.State state;
    mapping(address => Contribution) contributions;
    address[] contributionList;
    mapping(uint256 => address) contributionIndexToAddress;
    uint256 contributionCount;
}

struct PrizeInfo {
    address organizer;
    string name;
    string description;
    uint256 monetaryRewardPool;
    IPrizeCore.State state;
    string[] criteriaNames;
    uint32[] criteriaWeights;
    uint256 createdAt;
    IAllocationStrategy strategy;
    uint256 contributionCount;
    address prizeContributionContract;
    address prizeEvaluationContract;
    address prizeRewardContract;
}

struct PrizeContributions {
    mapping(address => Contribution) contributions;
    address[] contributionList;
    mapping(uint256 => address) contributionIndexToAddress;
    mapping(address => mapping(address => bool)) evaluatorContestantScored;
}

struct Contribution {
    address contestant;
    string description;
    euint32 aggregatedScore;
    uint256 evaluationCount;
    euint32 reward;
    bool claimed;
}

struct RoleData {
    EnumerableSet.AddressSet members;
    bytes32 adminRole;
}

library LibAppStorage {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.app.storage");
    uint256 constant MAX_BATCH_SIZE = 100;

    // bytes32 constant DEFAULT_ADMIN_ROLE = 0x00;

    function diamondStorage() internal pure returns (AppStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
