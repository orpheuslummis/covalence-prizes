// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../libraries/LibACL.sol";
import "../libraries/LibAllocationStrategies.sol";

contract PrizeManagerFacet {
    struct PrizeParams {
        string name;
        string description;
        uint256 pool;
        string[] criteria;
        uint16[] criteriaWeights;
        LibPrize.AllocationStrategy strategy;
    }

    struct PrizeDetails {
        uint256 id;
        address organizer;
        string name;
        string description;
        uint256 monetaryRewardPool;
        uint256 fundedAmount; // Added fundedAmount field
        LibPrize.State state;
        string[] criteriaNames;
        uint16[] criteriaWeights;
        uint256 createdAt;
        LibPrize.AllocationStrategy strategy;
        uint256 contributionCount;
        uint16 evaluatedContributionsCount;
        uint16 claimedRewardsCount;
        bool rewardsAllocated;
        uint256 lastProcessedIndex; // Added lastProcessedIndex field
    }

    // Anyone can create a prize
    function createPrize(PrizeParams memory params) external returns (uint256) {
        validatePrizeParams(params);
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 prizeId = s.prizeCount;
        s.prizeCount = prizeId + 1;

        Prize storage newPrize = s.prizes[prizeId];
        newPrize.organizer = msg.sender;
        newPrize.name = params.name;
        newPrize.description = params.description;
        newPrize.monetaryRewardPool = params.pool;
        newPrize.state = LibPrize.State.Setup;
        newPrize.createdAt = block.timestamp;
        newPrize.allocationStrategy = params.strategy;

        for (uint256 i = 0; i < params.criteria.length; i++) {
            newPrize.criteriaNames.push(params.criteria[i]);
            newPrize.criteriaWeights.push(params.criteriaWeights[i]);
        }

        emit LibPrize.PrizeCreated(msg.sender, prizeId, params.name, params.pool);
        return prizeId;
    }

    function getPrizeCount() external view returns (uint256) {
        return LibAppStorage.diamondStorage().prizeCount;
    }

    function getPrizeDetails(uint256 prizeId) external view returns (PrizeDetails memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        PrizeDetails memory prizeDetails = PrizeDetails({
            id: prizeId,
            organizer: LibPrize.getPrizeOrganizer(prizeId),
            name: LibPrize.getPrizeName(prizeId),
            description: LibPrize.getPrizeDescription(prizeId),
            monetaryRewardPool: LibPrize.getPrizeMonetaryRewardPool(prizeId),
            fundedAmount: LibPrize.getPrizeFundedAmount(prizeId),
            state: LibPrize.getPrizeState(prizeId),
            criteriaNames: LibPrize.getPrizeCriteriaNames(prizeId),
            criteriaWeights: LibPrize.getPrizeCriteriaWeights(prizeId),
            createdAt: prize.createdAt,
            strategy: LibPrize.getPrizeAllocationStrategy(prizeId),
            contributionCount: prize.contributionCount,
            evaluatedContributionsCount: prize.evaluatedContributionsCount,
            claimedRewardsCount: prize.claimedRewardsCount,
            rewardsAllocated: prize.rewardsAllocated,
            lastProcessedIndex: prize.lastProcessedIndex // Added lastProcessedIndex field
        });
        return prizeDetails;
    }

    function getPrizes(uint256 startIndex, uint256 count) external view returns (PrizeDetails[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(startIndex < s.prizeCount, "Start index out of bounds");

        uint256 endIndex = startIndex + count;
        if (endIndex > s.prizeCount) {
            endIndex = s.prizeCount;
        }

        uint256 actualCount = endIndex - startIndex;
        PrizeDetails[] memory prizeDetails = new PrizeDetails[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            prizeDetails[i] = this.getPrizeDetails(startIndex + i);
        }

        return prizeDetails;
    }

    function validatePrizeParams(PrizeParams memory params) internal pure {
        require(params.pool > 0, "Invalid pool amount");
        require(bytes(params.name).length > 0, "Name cannot be empty");
        require(bytes(params.description).length > 0, "Description cannot be empty");
        require(params.criteria.length > 0, "At least one criterion is required");
        require(
            params.criteria.length == params.criteriaWeights.length,
            "Criteria and weights must have the same length"
        );
        require(params.strategy != LibPrize.AllocationStrategy.Invalid, "Invalid allocation strategy");
        require(params.pool <= 4294 ether, "Prize pool exceeds maximum allowed");

        for (uint256 i = 0; i < params.criteriaWeights.length; i++) {
            require(params.criteriaWeights[i] <= 10, "Weight must be <= 10");
        }
    }
}
