// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrizeContract.sol";
import "./IAllocationStrategy.sol";

contract PrizeManager {
    struct Prize {
        address addr;
        string name;
        string description;
        uint256 pool;
        PrizeContract.State status;
        address allocationStrategy;
        string[] criteriaNames;
        uint256 createdAt;
        address organizer;
    }

    struct PrizeParams {
        string name;
        string desc;
        uint256 pool;
        string strategy;
        string[] criteria;
    }

    mapping(string => address) private strategyAddresses;
    address public owner;
    Prize[] public prizes;

    event PrizeCreated(address indexed org, address addr, string name, uint256 pool);
    event StrategyUpdated(string name, address addr);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    function updateStrategy(string memory strategyName, address strategyAddress) public onlyOwner {
        require(strategyAddress != address(0), "Invalid strategy address");
        strategyAddresses[strategyName] = strategyAddress;
        emit StrategyUpdated(strategyName, strategyAddress);
    }

    function createPrize(PrizeParams calldata params) external returns (address) {
        require(params.pool > 0 && bytes(params.name).length > 0 && bytes(params.desc).length > 0, "Invalid input");
        address stratAddr = strategyAddresses[params.strategy];
        require(stratAddr != address(0), "Invalid strategy");

        PrizeContract newPrize = new PrizeContract(
            msg.sender,
            params.name,
            params.desc,
            params.pool,
            stratAddr,
            params.criteria
        );
        address prizeAddr = address(newPrize);

        prizes.push(
            Prize({
                addr: prizeAddr,
                name: params.name,
                description: params.desc,
                pool: params.pool,
                status: PrizeContract.State.Setup,
                allocationStrategy: stratAddr,
                criteriaNames: params.criteria,
                createdAt: block.timestamp,
                organizer: msg.sender
            })
        );

        emit PrizeCreated(msg.sender, prizeAddr, params.name, params.pool);
        return prizeAddr;
    }

    function getPrizeCount() external view returns (uint256) {
        return prizes.length;
    }

    function getPrizeDetails(uint256 idx) external view returns (Prize memory) {
        require(idx < prizes.length, "Invalid index");
        return prizes[idx];
    }

    function parseStringToUint256(string memory str) internal pure returns (uint256) {
        bytes memory b = bytes(str);
        uint256 result = 0;
        for (uint i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }
}
