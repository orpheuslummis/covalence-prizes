// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../interfaces/IAllocationStrategy.sol";
import "./PrizeACLFacet.sol";

contract PrizeStrategyFacet {
    PrizeACLFacet acl = PrizeACLFacet(address(this));

    function getAllocationStrategy(uint256 prizeId) external view returns (IAllocationStrategy) {
        return LibPrize.getPrizeAllocationStrategy(prizeId);
    }

    function setAllocationStrategy(uint256 prizeId, address _strategyAddress) external {
        require(acl.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");

        require(LibPrize.getPrizeState(prizeId) == LibPrize.State.Setup, "Can only set strategy during setup");
        IAllocationStrategy newStrategy = IAllocationStrategy(_strategyAddress);
        LibPrize.setPrizeAllocationStrategy(prizeId, newStrategy);

        emit LibPrize.AllocationStrategySet(prizeId, _strategyAddress);
    }
}
