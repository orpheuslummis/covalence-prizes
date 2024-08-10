// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";

contract PrizeContributionFacet {
    function submitContribution(uint256 prizeId, string memory _description) external {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(LibPrize.isState(prizeId, LibPrize.State.Open), "Invalid state");
        require(bytes(_description).length > 0, "Description cannot be empty");

        Prize storage prize = s.prizes[prizeId];

        Contribution memory newContribution = Contribution({
            contestant: msg.sender,
            description: _description,
            aggregatedScore: FHE.asEuint16(0),
            evaluationCount: 0,
            reward: FHE.asEuint32(0),
            claimed: false
        });

        prize.contributions[msg.sender].push(newContribution);
        prize.contributionAddressList.push(msg.sender);
        prize.contributionCount++;

        emit LibPrize.ContributionAdded(msg.sender, _description);
    }

    function getContribution(
        uint256 prizeId,
        address contestant,
        uint256 contributionIndex
    ) external view returns (address, string memory, euint16, uint16, euint32, bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Contribution[] storage contributions = s.prizes[prizeId].contributions[contestant];
        require(contributionIndex < contributions.length, "Invalid contribution index");
        Contribution storage contribution = contributions[contributionIndex];
        return (
            contribution.contestant,
            contribution.description,
            contribution.aggregatedScore,
            contribution.evaluationCount,
            contribution.reward,
            contribution.claimed
        );
    }

    // todo batch
    function getContributionList(uint256 prizeId) external view returns (address[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].contributionAddressList;
    }

    function getContributionCount(uint256 prizeId) external view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].contributionCount;
    }

    function getContributionByIndex(uint256 prizeId, uint256 index) external view returns (address, uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(index < s.prizes[prizeId].contributionCount, "Index out of bounds");
        address contestant = s.prizes[prizeId].contributionAddressList[index];
        uint256 contributionIndex = s.prizes[prizeId].contributions[contestant].length - 1;
        return (contestant, contributionIndex);
    }
}
