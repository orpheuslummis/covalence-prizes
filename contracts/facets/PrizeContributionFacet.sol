// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IPrizeCore.sol";

contract PrizeContributionFacet {
    event ContributionAdded(address contestant, string description);

    modifier onlyInState(IPrizeCore.State _state) {
        require(LibAppStorage.diamondStorage().state == _state, "Invalid state");
        _;
    }

    function submitContribution(string memory _description) external onlyInState(IPrizeCore.State.Open) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(s.contributions[msg.sender].contestant == address(0), "Contestant has already submitted");

        s.contributions[msg.sender] = Contribution({
            contestant: msg.sender,
            description: _description,
            aggregatedScore: FHE.asEuint32(0),
            evaluationCount: 0,
            reward: FHE.asEuint32(0),
            claimed: false
        });

        s.contributionList.push(msg.sender);
        s.contributionIndexToAddress[s.contributionCount] = msg.sender;
        s.contributionCount++;

        emit ContributionAdded(msg.sender, _description);
    }

    function getContribution(
        address contestant
    ) external view returns (address, string memory, euint32, uint256, euint32, bool) {
        Contribution storage contribution = LibAppStorage.diamondStorage().contributions[contestant];
        return (
            contribution.contestant,
            contribution.description,
            contribution.aggregatedScore,
            contribution.evaluationCount,
            contribution.reward,
            contribution.claimed
        );
    }

    function getContributionList() external view returns (address[] memory) {
        return LibAppStorage.diamondStorage().contributionList;
    }

    function getContributionCount() external view returns (uint256) {
        return LibAppStorage.diamondStorage().contributionCount;
    }

    function getContributionByIndex(uint256 index) external view returns (address) {
        return LibAppStorage.diamondStorage().contributionIndexToAddress[index];
    }
}
