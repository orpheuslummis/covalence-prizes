// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";

contract PrizeContributionFacet {
    // A contestant can submit multiple contributions
    function submitContribution(uint256 prizeId, string memory _description) external returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(LibPrize.isState(prizeId, LibPrize.State.Open), "Invalid state");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(bytes(_description).length < 200, "Description cannot be longer than 200 characters");

        Prize storage prize = s.prizes[prizeId];

        uint256 contributionId = prize.contributionCount;

        Contribution memory newContribution = Contribution({
            id: contributionId,
            contestant: msg.sender,
            description: _description,
            evaluationCount: 0,
            evaluated: false,
            weightedScore: FHE.asEuint32(0),
            reward: FHE.asEuint32(0),
            claimed: false
        });

        prize.contributionsById[contributionId] = newContribution;
        LibPrize.addContributionForContestant(prizeId, msg.sender, contributionId);
        prize.contributionCount++;

        emit LibPrize.ContributionAdded(prizeId, msg.sender, _description, contributionId);
        return contributionId;
    }

    function getContributionCount(uint256 prizeId) external view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].contributionCount;
    }

    function getContribution(uint256 prizeId, uint256 contributionId) external view returns (Contribution memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(contributionId < prize.contributionCount, "Invalid contribution ID");
        return prize.contributionsById[contributionId];
    }

    function getContributionByIndex(uint256 prizeId, uint256 index) external view returns (address, uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(index < prize.contributionCount, "Index out of bounds");
        Contribution memory contribution = prize.contributionsById[index];
        return (contribution.contestant, contribution.id);
    }

    function getContributionIdsForContestant(
        uint256 prizeId,
        address contestant
    ) external view returns (uint256[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].contributionIdsByContestant[contestant];
    }
}
