// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../interfaces/IAllocationStrategy.sol";
import "../facets/PrizeACLFacet.sol";

contract PrizeRewardFacet {
    PrizeACLFacet acl = PrizeACLFacet(address(this));

    function _getContestantScores(
        uint256 prizeId,
        address[] memory contestants
    ) private view returns (euint32[] memory scores, uint256[] memory evaluationCounts) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        scores = new euint32[](contestants.length);
        evaluationCounts = new uint256[](contestants.length);

        for (uint256 i = 0; i < contestants.length; i++) {
            Contribution storage contribution = prize.contributions[contestants[i]];
            scores[i] = contribution.aggregatedScore;
            evaluationCounts[i] = contribution.evaluationCount;
        }
    }

    function claimReward(uint256 prizeId) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Rewarding), "Invalid state");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        Contribution storage contribution = prize.contributions[msg.sender];
        require(!contribution.claimed, "Reward already claimed");

        uint256 rewardAmount = FHE.decrypt(contribution.reward);
        require(rewardAmount > 0, "No reward to claim");
        require(address(this).balance >= rewardAmount, "Insufficient contract balance");

        contribution.claimed = true;
        payable(msg.sender).transfer(rewardAmount);

        emit LibPrize.RewardClaimed(prizeId, msg.sender, rewardAmount);
    }

    function getContributionReward(
        uint256 prizeId,
        address contestant
    ) external view returns (euint32 reward, bool claimed) {
        Contribution storage contribution = LibAppStorage.diamondStorage().prizes[prizeId].contributions[contestant];
        return (contribution.reward, contribution.claimed);
    }

    function allocateRewards(uint256 prizeId) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Evaluating), "Invalid state");
        require(acl.isPrizeOrganizer(prizeId, msg.sender), "Only prize organizer can allocate rewards");

        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        // Add this check
        require(!prize.rewardsAllocated, "Rewards have already been allocated");

        address[] memory contestants = prize.contributionList;
        require(contestants.length > 0, "No contestants to allocate rewards");

        // Set the flag before any state-changing operations
        prize.rewardsAllocated = true;

        (euint32[] memory scores, uint256[] memory evaluationCounts) = _getContestantScores(prizeId, contestants);

        euint32[] memory rewards = LibPrize.getPrizeAllocationStrategy(prizeId).allocateRewards(
            contestants,
            scores,
            evaluationCounts
        );

        for (uint256 i = 0; i < contestants.length; i++) {
            prize.contributions[contestants[i]].reward = rewards[i];
        }

        LibPrize.setPrizeState(prizeId, LibPrize.State.Rewarding);
        emit LibPrize.RewardsAllocated(prizeId, contestants.length);
    }
}
