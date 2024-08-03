// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import {PrizeACLFacet} from "./PrizeACLFacet.sol";

contract PrizeStateFacet {
    PrizeACLFacet acl = PrizeACLFacet(address(this));

    function getState(uint256 prizeId) external view returns (LibPrize.State) {
        return LibPrize.getPrizeState(prizeId);
    }

    function moveToNextState(uint256 prizeId) external {
        require(acl.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        LibPrize.State newState;

        if (prize.state == LibPrize.State.Setup) {
            require(LibPrize.getPrizeMonetaryRewardPool(prizeId) > 0, "Prize pool must be funded before opening");
            require(
                LibPrize.getPrizeAllocationStrategy(prizeId) != IAllocationStrategy(address(0)),
                "Allocation strategy must be set"
            );
            newState = LibPrize.State.Open;
        } else if (prize.state == LibPrize.State.Open) {
            require(prize.contributionList.length > 0, "At least one contribution is required");
            newState = LibPrize.State.Evaluating;
        } else if (prize.state == LibPrize.State.Evaluating) {
            require(_allContributionsEvaluated(prizeId), "All contributions must be evaluated");
            newState = LibPrize.State.Rewarding;
        } else if (prize.state == LibPrize.State.Rewarding) {
            require(_allRewardsClaimed(prizeId), "All rewards must be claimed");
            newState = LibPrize.State.Closed;
        } else {
            revert("Cannot move to next state");
        }

        LibPrize.State oldState = prize.state;
        LibPrize.setPrizeState(prizeId, newState);
        emit LibPrize.StateChanged(prizeId, oldState, newState);
    }

    function _allContributionsEvaluated(uint256 prizeId) internal view returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        uint256 i = 0;
        for (i; i < prize.contributionList.length; i++) {
            if (prize.contributions[prize.contributionList[i]].evaluationCount == 0) {
                return false;
            }
        }
        return true;
    }

    function _allRewardsClaimed(uint256 prizeId) internal view returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        uint256 i = 0;
        for (i; i < prize.contributionList.length; i++) {
            if (!prize.contributions[prize.contributionList[i]].claimed) {
                return false;
            }
        }
        return true;
    }
}
