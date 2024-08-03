// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IERC165} from "../interfaces/IERC165.sol";
import "../facets/PrizeACLFacet.sol";

contract DiamondInit {
    function init(address _admin) external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

        // Initialize PrizeACLFacet
        PrizeACLFacet(address(this)).initializePrizeACL(_admin);

        // Initialize other facets as needed
        // Example: PrizeManagerFacet(address(this)).initializePrizeManager();
    }
}
