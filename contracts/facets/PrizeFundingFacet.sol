// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../libraries/LibACL.sol";

contract PrizeFundingFacet {
    function fundTotally(uint256 prizeId) external payable {
        require(LibPrize.isState(prizeId, LibPrize.State.Setup), "Invalid state");
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");

        uint256 prizePool = LibPrize.getPrizeMonetaryRewardPool(prizeId);
        require(msg.value == prizePool, "Must send exact prize amount");

        LibPrize.setPrizeFundedAmount(prizeId, prizePool);

        emit LibPrize.PrizeFunded(prizeId, msg.sender, msg.value, prizePool);
    }
}
