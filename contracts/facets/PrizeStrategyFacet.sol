// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../libraries/LibACL.sol";
import "../libraries/LibAllocationStrategies.sol";

contract PrizeStrategyFacet {
    function getAllocationStrategy(uint256 prizeId) external view returns (LibPrize.AllocationStrategy) {
        return LibPrize.getPrizeAllocationStrategy(prizeId);
    }

    function setAllocationStrategy(uint256 prizeId, LibPrize.AllocationStrategy strategy) external {
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        require(LibPrize.getPrizeState(prizeId) == LibPrize.State.Setup, "Can only set strategy during setup");

        LibPrize.setPrizeAllocationStrategy(prizeId, strategy);

        emit LibPrize.AllocationStrategySet(prizeId, strategy);
    }

    function getAllAllocationStrategies() external pure returns (LibPrize.AllocationStrategy[] memory) {
        return LibPrize.getAllAllocationStrategies();
    }
}
