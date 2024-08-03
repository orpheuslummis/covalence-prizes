// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IAllocationStrategy.sol";
import "../interfaces/IPrizeCore.sol";
import "../facets/PrizeACLFacet.sol";

contract PrizeRewardFacet {
    event RewardsAllocated(uint256 indexed prizeId, uint256 contestantCount);
    event RewardClaimed(uint256 indexed prizeId, address indexed contestant, uint256 amount);

    modifier onlyInState(uint256 prizeId, IPrizeCore.State _state) {
        require(LibAppStorage.diamondStorage().prizes[prizeId].state == _state, "Invalid state");
        _;
    }

    modifier onlyOrganizer(uint256 prizeId) {
        require(
            PrizeACLFacet(address(this)).hasRole(PrizeACLFacet(address(this)).ORGANIZER_ROLE(), msg.sender) ||
                LibAppStorage.diamondStorage().prizes[prizeId].organizer == msg.sender,
            "Only organizer can perform this action"
        );
        _;
    }

    function allocateRewards(
        uint256 prizeId
    ) external onlyOrganizer(prizeId) onlyInState(prizeId, IPrizeCore.State.Rewarding) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];
        address[] memory contestants = prize.contributionList;
        require(contestants.length > 0, "No contestants to allocate rewards");

        (euint32[] memory scores, uint256[] memory evaluationCounts) = _getContestantScores(prizeId, contestants);

        euint32[] memory rewards = prize.strategy.allocateRewards(contestants, scores, evaluationCounts);

        for (uint256 i = 0; i < contestants.length; i++) {
            prize.contributions[contestants[i]].reward = rewards[i];
        }

        emit RewardsAllocated(prizeId, contestants.length);
    }

    function _getContestantScores(
        uint256 prizeId,
        address[] memory contestants
    ) private view returns (euint32[] memory scores, uint256[] memory evaluationCounts) {
        PrizeInfo storage prize = LibAppStorage.diamondStorage().prizes[prizeId];
        scores = new euint32[](contestants.length);
        evaluationCounts = new uint256[](contestants.length);

        for (uint256 i = 0; i < contestants.length; i++) {
            Contribution storage contribution = prize.contributions[contestants[i]];
            scores[i] = contribution.aggregatedScore;
            evaluationCounts[i] = contribution.evaluationCount;
        }
    }

    function claimReward(uint256 prizeId) external onlyInState(prizeId, IPrizeCore.State.Rewarding) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];
        Contribution storage contribution = prize.contributions[msg.sender];
        require(!contribution.claimed, "Reward already claimed");

        uint256 rewardAmount = FHE.decrypt(contribution.reward);
        require(rewardAmount > 0, "No reward to claim");
        require(address(this).balance >= rewardAmount, "Insufficient contract balance");

        contribution.claimed = true;
        payable(msg.sender).transfer(rewardAmount);

        emit RewardClaimed(prizeId, msg.sender, rewardAmount);
    }

    function getContributionReward(
        uint256 prizeId,
        address contestant
    ) external view returns (euint32 reward, bool claimed) {
        Contribution storage contribution = LibAppStorage.diamondStorage().prizes[prizeId].contributions[contestant];
        return (contribution.reward, contribution.claimed);
    }
}
