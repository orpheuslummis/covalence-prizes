// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import {IAllocationStrategy} from "../interfaces/IAllocationStrategy.sol";
import {LibPrize} from "./LibPrize.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

struct AppStorage {
    mapping(uint256 => Prize) prizes;
    uint256 prizeCount;
    mapping(bytes32 => RoleData) roles;
    bool initialized;
    mapping(uint256 => PrizeRoles) prizeRoles;
}

struct PrizeRoles {
    address organizer;
    EnumerableSet.AddressSet evaluators;
}

struct Prize {
    address organizer;
    string name;
    string description;
    uint256 monetaryRewardPool;
    LibPrize.State state;
    string[] criteriaNames;
    uint32[] criteriaWeights;
    uint256 createdAt;
    IAllocationStrategy strategy;
    mapping(address => Contribution) contributions;
    address[] contributionList;
    uint256 contributionCount;
    mapping(address => mapping(address => bool)) evaluatorContestantScored;
    mapping(uint256 => address) contributionIndexToAddress;
    address contributionContract;
    address evaluationContract;
    address rewardContract;
    bool rewardsAllocated;
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

    function diamondStorage() internal pure returns (AppStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
