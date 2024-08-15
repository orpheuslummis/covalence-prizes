// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {LibPrize} from "./LibPrize.sol";

struct AppStorage {
    bool initialized;
    mapping(uint256 => Prize) prizes;
    uint256 prizeCount;
    mapping(bytes32 => RoleData) roles;
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
    uint256 fundedAmount;
    string[] criteriaNames;
    uint16[] criteriaWeights;
    LibPrize.AllocationStrategy allocationStrategy;
    LibPrize.State state;
    mapping(uint256 => Contribution) contributionsById;
    mapping(address => mapping(address => mapping(uint256 => bool))) evaluatorContestantScored;
    bool rewardsAllocated;
    uint16 evaluatedContributionsCount;
    uint16 claimedRewardsCount;
    uint32 contributionCount;
    euint32 totalScore;
    mapping(address => uint256[]) contributionIdsByContestant;
    uint256 lastProcessedIndex;
    EnumerableSet.AddressSet evaluators;
    mapping(address => euint32) claimedRewards;
}

struct Contribution {
    uint256 id;
    address contestant;
    string description;
    uint16 evaluationCount;
    bool evaluated;
    euint32 weightedScore;
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
