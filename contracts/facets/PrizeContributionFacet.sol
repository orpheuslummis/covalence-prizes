// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";

contract PrizeContributionFacet {
    event ContributionAdded(address contestant, string description);

    function submitContribution(uint256 prizeId, string memory _description) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Open), "Invalid state");
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(
            s.prizes[prizeId].contributions[msg.sender].contestant == address(0),
            "Contestant has already submitted"
        );

        s.prizes[prizeId].contributions[msg.sender] = Contribution({
            contestant: msg.sender,
            description: _description,
            aggregatedScore: FHE.asEuint32(0),
            evaluationCount: 0,
            reward: FHE.asEuint32(0),
            claimed: false
        });

        s.prizes[prizeId].contributionList.push(msg.sender);
        s.prizes[prizeId].contributionCount++;
        // s.contributionIndexToAddress[s.prizes[prizeId].contributionCount] = msg.sender;

        emit ContributionAdded(msg.sender, _description);
    }

    function getContribution(
        uint256 prizeId,
        address contestant
    ) external view returns (address, string memory, euint32, uint256, euint32, bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Contribution storage contribution = s.prizes[prizeId].contributions[contestant];
        return (
            contribution.contestant,
            contribution.description,
            contribution.aggregatedScore,
            contribution.evaluationCount,
            contribution.reward,
            contribution.claimed
        );
    }

    function getContributionList(uint256 prizeId) external view returns (address[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].contributionList;
    }

    function getContributionCount(uint256 prizeId) external view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.prizes[prizeId].contributionCount;
    }

    function getContributionByIndex(uint256 prizeId, uint256 index) external view returns (address) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(index < s.prizes[prizeId].contributionCount, "Index out of bounds");
        return s.prizes[prizeId].contributionList[index];
    }
}
