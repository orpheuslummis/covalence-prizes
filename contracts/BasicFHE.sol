// contracts/BasicFHE.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@fhenixprotocol/contracts/FHE.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";

contract BasicFHE is Permissioned {
    mapping(address => euint32) private value1;
    mapping(address => euint32) private value2;

    function setValue1(inEuint32 calldata _value) public {
        value1[msg.sender] = FHE.asEuint32(_value);
    }

    function setValue2(inEuint32 calldata _value) public {
        value2[msg.sender] = FHE.asEuint32(_value);
    }

    function addSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.add(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function multiplySealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.mul(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function subtractSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.sub(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    // times out
    function divideSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.div(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function modSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.rem(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function bitwiseAndSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.and(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function bitwiseOrSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.or(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function bitwiseXorSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.xor(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function shiftRightSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.shr(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function shiftLeftSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.shl(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function equalSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        ebool result = FHE.eq(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function greaterThanSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        ebool result = FHE.gt(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function minSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.min(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function maxSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.max(value1[msg.sender], value2[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }

    function notSealed(Permission memory permission) public view onlySender(permission) returns (string memory) {
        euint32 result = FHE.not(value1[msg.sender]);
        return FHE.sealoutput(result, permission.publicKey);
    }
}