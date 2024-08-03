// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../interfaces/IAllocationStrategy.sol";
import "../interfaces/IPrizeCore.sol";
import "../libraries/LibDiamond.sol";
import "./PrizeACLFacet.sol";

contract PrizeManagerFacet {
    bytes32 public constant PRIZE_MANAGER_ROLE = keccak256("PRIZE_MANAGER_ROLE");

    struct PrizeParams {
        string name;
        string description;
        uint256 pool;
        string[] criteria;
    }

    struct PrizeDetails {
        uint256 id;
        address organizer;
        string name;
        string description;
        uint256 monetaryRewardPool;
        IPrizeCore.State state;
        string[] criteriaNames;
        uint32[] criteriaWeights;
        uint256 createdAt;
        IAllocationStrategy strategy;
        uint256 contributionCount;
    }

    event PrizeCreated(address indexed organizer, uint256 indexed prizeId, string name, uint256 pool);
    event StrategyUpdated(uint256 indexed prizeId, address indexed strategyAddress);
    event PrizeContractsSet(
        uint256 indexed prizeId,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    );

    modifier onlyRole(bytes32 role) {
        require(PrizeACLFacet(address(this)).hasRole(role, msg.sender), "Caller does not have the required role");
        _;
    }

    function createPrize(PrizeParams memory params) external returns (uint256) {
        validatePrizeParams(params);
        AppStorage storage s = LibAppStorage.diamondStorage();
        uint256 prizeId = s.prizeCount++;

        PrizeInfo storage newPrize = s.prizes[prizeId];
        newPrize.organizer = msg.sender;
        newPrize.name = params.name;
        newPrize.description = params.description;
        newPrize.monetaryRewardPool = params.pool;
        newPrize.state = IPrizeCore.State.Setup;
        newPrize.criteriaNames = params.criteria;
        newPrize.criteriaWeights = new uint32[](params.criteria.length);
        newPrize.createdAt = block.timestamp;
        newPrize.strategy = IAllocationStrategy(address(0));
        newPrize.contributionCount = 0;

        emit PrizeCreated(msg.sender, prizeId, params.name, params.pool);
        return prizeId;
    }

    function getPrizeCount() external view returns (uint256) {
        return LibAppStorage.diamondStorage().prizeCount;
    }

    function getPrizeDetails(uint256 prizeId) external view returns (PrizeDetails memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];

        return
            PrizeDetails({
                id: prizeId,
                organizer: prize.organizer,
                name: prize.name,
                description: prize.description,
                monetaryRewardPool: prize.monetaryRewardPool,
                state: prize.state,
                criteriaNames: prize.criteriaNames,
                criteriaWeights: prize.criteriaWeights,
                createdAt: prize.createdAt,
                strategy: prize.strategy,
                contributionCount: prize.contributionCount
            });
    }

    function getPrizes() external view returns (PrizeDetails[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeDetails[] memory prizeDetails = new PrizeDetails[](s.prizeCount);
        for (uint256 i = 0; i < s.prizeCount; i++) {
            PrizeInfo storage prize = s.prizes[i];
            prizeDetails[i] = PrizeDetails({
                id: i,
                organizer: prize.organizer,
                name: prize.name,
                description: prize.description,
                monetaryRewardPool: prize.monetaryRewardPool,
                state: prize.state,
                criteriaNames: prize.criteriaNames,
                criteriaWeights: prize.criteriaWeights,
                createdAt: prize.createdAt,
                strategy: prize.strategy,
                contributionCount: prize.contributionCount
            });
        }
        return prizeDetails;
    }

    function setPrizeContracts(
        uint256 prizeId,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    ) external onlyRole(PRIZE_MANAGER_ROLE) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(prizeId < s.prizeCount, "Invalid prize ID");

        s.prizeContributions[prizeId].contributionContract = contributionContract;
        s.prizeContributions[prizeId].evaluationContract = evaluationContract;
        s.prizeContributions[prizeId].rewardContract = rewardContract;

        emit PrizeContractsSet(prizeId, contributionContract, evaluationContract, rewardContract);
    }

    // Internal functions
    function validatePrizeParams(PrizeParams memory params) internal pure {
        require(params.pool > 0, "Invalid pool amount");
        require(bytes(params.name).length > 0, "Name cannot be empty");
        require(bytes(params.description).length > 0, "Description cannot be empty");
        require(params.criteria.length > 0, "At least one criterion is required");
    }
}
