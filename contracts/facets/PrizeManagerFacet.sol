// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../interfaces/IAllocationStrategy.sol";
import "./PrizeACLFacet.sol";

contract PrizeManagerFacet {
    struct PrizeParams {
        string name;
        string description;
        uint256 pool;
        string[] criteria;
        uint32[] criteriaWeights;
    }

    struct PrizeDetails {
        uint256 id;
        address organizer;
        string name;
        string description;
        uint256 monetaryRewardPool;
        LibPrize.State state;
        string[] criteriaNames;
        uint32[] criteriaWeights;
        uint256 createdAt;
        IAllocationStrategy strategy;
        uint256 contributionCount;
    }

    PrizeACLFacet acl = PrizeACLFacet(address(this));

    function createPrize(PrizeParams memory params) external returns (uint256) {
        validatePrizeParams(params);
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 prizeId = s.prizeCount++;

        Prize storage newPrize = s.prizes[prizeId];
        newPrize.organizer = msg.sender;
        newPrize.name = params.name;
        newPrize.description = params.description;
        newPrize.monetaryRewardPool = params.pool;
        newPrize.state = LibPrize.State.Setup;
        newPrize.createdAt = block.timestamp;

        for (uint256 i = 0; i < params.criteria.length; i++) {
            newPrize.criteriaNames.push(params.criteria[i]);
            newPrize.criteriaWeights.push(params.criteriaWeights[i]);
        }

        acl.setPrizeOrganizer(prizeId, msg.sender);

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
            contributionCount: prize.contributionList.length
        });
        return prizeDetails;
    }

    function getPrizes() external view returns (PrizeDetails[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeDetails[] memory prizeDetails = new PrizeDetails[](s.prizeCount);
        for (uint256 i = 0; i < s.prizeCount; i++) {
            prizeDetails[i] = this.getPrizeDetails(i);
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

        for (uint256 i = 0; i < params.criteriaWeights.length; i++) {
            require(params.criteriaWeights[i] > 0, "Criterion weight must be greater than 0");
        }
    }
}
