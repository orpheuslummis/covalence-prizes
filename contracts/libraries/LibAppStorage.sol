// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import {LibPrize} from "./LibPrize.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

struct AppStorage {
    bool initialized;
    mapping(uint256 => Prize) prizes;
    uint256 prizeCount;
    mapping(bytes32 => RoleData) roles;
    mapping(uint256 => PrizeRoles) prizeRoles;
}

struct PrizeRoles {
    address organizer;
    EnumerableSet.AddressSet evaluators;
}

struct RoleData {
    EnumerableSet.AddressSet members;
    bytes32 adminRole;
}

struct Prize {
    address organizer;
    string name;
    string description;
    uint256 createdAt;
    uint256 monetaryRewardPool;
    string[] criteriaNames;
    uint16[] criteriaWeights; // Changed from uint8[] to uint16[]
    LibPrize.AllocationStrategy allocationStrategy;
    LibPrize.State state;
    mapping(address => Contribution[]) contributions;
    address[] contributionAddressList;
    uint16 contributionCount;
    mapping(address => mapping(address => bool)) evaluatorContestantScored;
    bool rewardsAllocated;
    mapping(address => bool) contributionEvaluated;
    mapping(address => bool) contributionClaimed;
    uint16 evaluatedContributionsCount;
    uint16 claimedRewardsCount;
}

struct Contribution {
    address contestant;
    string description;
    uint16 evaluationCount;
    euint16 aggregatedScore;
    euint32 reward;
    bool claimed;
}

library LibAppStorage {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.app.storage");
    // TBD
    uint256 constant MAX_BATCH_SIZE = 100;

    function diamondStorage() internal pure returns (AppStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
