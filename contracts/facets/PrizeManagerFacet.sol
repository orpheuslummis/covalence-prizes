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
        LibPrize.State state;
        string[] criteriaNames;
        uint16[] criteriaWeights;
        uint256 createdAt;
        LibPrize.AllocationStrategy strategy;
        uint256 contributionCount;
    }

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

        LibPrize.setPrizeAllocationStrategy(prizeId, params.strategy);

        for (uint256 i = 0; i < params.criteria.length; i++) {
            newPrize.criteriaNames.push(params.criteria[i]);
            newPrize.criteriaWeights.push(params.criteriaWeights[i]);
        }

        LibACL.setPrizeOrganizer(prizeId, msg.sender);

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
            state: LibPrize.getPrizeState(prizeId),
            criteriaNames: LibPrize.getPrizeCriteriaNames(prizeId),
            criteriaWeights: LibPrize.getPrizeCriteriaWeights(prizeId),
            createdAt: prize.createdAt,
            strategy: LibPrize.getPrizeAllocationStrategy(prizeId),
            contributionCount: prize.contributionAddressList.length
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

    function getTotalPrizeCount() external view returns (uint256) {
        return LibAppStorage.diamondStorage().prizeCount;
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
    }
}
