// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../libraries/LibACL.sol";

contract PrizeStateFacet {
    function getState(uint256 prizeId) external view returns (LibPrize.State) {
        return LibPrize.getPrizeState(prizeId);
    }

    function moveToNextState(uint256 prizeId) external {
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        LibPrize.State newState;

        if (prize.state == LibPrize.State.Setup) {
            require(LibPrize.getPrizeMonetaryRewardPool(prizeId) > 0, "Prize pool must be funded before opening");
            require(
                LibPrize.getPrizeAllocationStrategy(prizeId) != LibPrize.AllocationStrategy.Invalid,
                "Invalid allocation strategy"
            );
            newState = LibPrize.State.Open;
        } else if (prize.state == LibPrize.State.Open) {
            require(prize.contributionAddressList.length > 0, "At least one contribution is required");
            newState = LibPrize.State.Evaluating;
        } else if (prize.state == LibPrize.State.Evaluating) {
            require(prize.evaluatedContributionsCount == prize.contributionCount, "Not all contributions evaluated");
            newState = LibPrize.State.Allocating;
        } else if (prize.state == LibPrize.State.Allocating) {
            newState = LibPrize.State.Claiming;
        } else if (prize.state == LibPrize.State.Claiming) {
            require(prize.claimedRewardsCount == prize.contributionCount, "Not all rewards claimed");
            newState = LibPrize.State.Closed;
        } else {
            revert("Cannot move to next state");
        }

        LibPrize.State oldState = prize.state;
        LibPrize.setPrizeState(prizeId, newState);
        emit LibPrize.StateChanged(prizeId, oldState, newState);
    }

    function updateEvaluationStatus(uint256 prizeId, address[] calldata contributors) external {
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        require(LibPrize.isState(prizeId, LibPrize.State.Evaluating), "Invalid state");

        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        for (uint256 i = 0; i < contributors.length; i++) {
            address contributor = contributors[i];
            if (prize.contributions[contributor].length > 0) {
                Contribution storage contribution = prize.contributions[contributor][
                    prize.contributions[contributor].length - 1
                ];
                if (contribution.evaluationCount > 0 && !prize.contributionEvaluated[contributor]) {
                    prize.contributionEvaluated[contributor] = true;
                    prize.evaluatedContributionsCount++;
                }
            }
        }
    }

    function updateClaimStatus(uint256 prizeId, address[] calldata contributors) external {
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        require(LibPrize.isState(prizeId, LibPrize.State.Claiming), "Invalid state");

        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        for (uint256 i = 0; i < contributors.length; i++) {
            address contributor = contributors[i];
            if (prize.contributions[contributor].length > 0) {
                Contribution storage contribution = prize.contributions[contributor][
                    prize.contributions[contributor].length - 1
                ];
                if (contribution.claimed && !prize.contributionClaimed[contributor]) {
                    prize.contributionClaimed[contributor] = true;
                    prize.claimedRewardsCount++;
                }
            }
        }
    }
}
