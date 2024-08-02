// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import {IAllocationStrategy} from "../interfaces/IAllocationStrategy.sol";
import {IPrizeCore} from "../interfaces/IPrizeCore.sol";

struct AppStorage {
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
    mapping(address => Contribution) contributions;
    address[] contributionList;
    mapping(uint256 => address) contributionIndexToAddress;
    mapping(address => mapping(address => bool)) evaluatorContestantScored;
    address prizeContributionContract;
    address prizeEvaluationContract;
    address prizeRewardContract;
    uint256 prizeCount;
    mapping(uint256 => PrizeInfo) prizes;
}

struct PrizeInfo {
    address organizer;
    string name;
    string description;
    uint256 monetaryRewardPool;
    IPrizeCore.State state;
}

struct Contribution {
    address contestant;
    string description;
    euint32 aggregatedScore;
    uint256 evaluationCount;
    euint32 reward;
    bool claimed;
}

struct PrizeParams {
    string name;
    string desc;
    uint256 pool;
    string strategy;
    string[] criteria;
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
