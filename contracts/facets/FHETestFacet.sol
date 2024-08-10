// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";

contract FHETestFacet is Permissioned {
    euint32 private lastSum;
    euint32 private lastProduct;
    ebool private lastComparison;
    euint32 private lastSelection;

    function addEncrypted(inEuint32 calldata a, inEuint32 calldata b) public {
        euint32 encryptedA = FHE.asEuint32(a);
        euint32 encryptedB = FHE.asEuint32(b);
        lastSum = FHE.add(encryptedA, encryptedB);
    }

    function multiplyEncrypted(inEuint32 calldata a, inEuint32 calldata b) public {
        euint32 encryptedA = FHE.asEuint32(a);
        euint32 encryptedB = FHE.asEuint32(b);
        lastProduct = FHE.mul(encryptedA, encryptedB);
    }

    function compareEncrypted(inEuint32 calldata a, inEuint32 calldata b) public {
        euint32 encryptedA = FHE.asEuint32(a);
        euint32 encryptedB = FHE.asEuint32(b);
        lastComparison = FHE.lte(encryptedA, encryptedB);
    }

    function selectEncrypted(inEuint32 calldata a, inEuint32 calldata b) public {
        euint32 encryptedA = FHE.asEuint32(a);
        euint32 encryptedB = FHE.asEuint32(b);
        ebool condition = FHE.gt(encryptedA, encryptedB);
        lastSelection = FHE.select(condition, encryptedA, encryptedB);
    }

    function getLastSum(Permission calldata permission) public view onlySender(permission) returns (string memory) {
        return FHE.sealoutput(lastSum, permission.publicKey);
    }

    function getLastProduct(Permission calldata permission) public view onlySender(permission) returns (string memory) {
        return FHE.sealoutput(lastProduct, permission.publicKey);
    }

    function getLastComparison(
        Permission calldata permission
    ) public view onlySender(permission) returns (string memory) {
        return FHE.sealoutput(lastComparison, permission.publicKey);
    }

    function getLastSelection(
        Permission calldata permission
    ) public view onlySender(permission) returns (string memory) {
        return FHE.sealoutput(lastSelection, permission.publicKey);
    }
}
