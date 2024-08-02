// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IAllocationStrategy.sol";
import "../interfaces/IPrizeManager.sol";
import "../libraries/LibDiamond.sol";

contract PrizeManagerFacet is AccessControlEnumerable, IPrizeManager {
    bytes32 public constant PRIZE_MANAGER_ROLE = keccak256("PRIZE_MANAGER_ROLE");

    modifier onlyPrizeManager() {
        require(hasRole(PRIZE_MANAGER_ROLE, msg.sender), "Caller is not a prize manager");
        _;
    }

    function initialize(address _admin) external {
        require(getRoleMemberCount(DEFAULT_ADMIN_ROLE) == 0, "Already initialized");
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _setRoleAdmin(PRIZE_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function updateStrategy(string memory strategyName, address strategyAddress) external override onlyPrizeManager {
        require(strategyAddress != address(0), "Invalid strategy address");
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.strategy = IAllocationStrategy(strategyAddress);
        emit StrategyUpdated(strategyName, strategyAddress);
    }

    function createPrize(PrizeParams memory params) external override onlyPrizeManager returns (address) {
        require(
            params.pool > 0 && bytes(params.name).length > 0 && bytes(params.description).length > 0,
            "Invalid input"
        );
        AppStorage storage s = LibAppStorage.diamondStorage();

        address prizeAddr = address(this);
        s.organizer = msg.sender;
        s.name = params.name;
        s.description = params.description;
        s.monetaryRewardPool = params.pool;
        s.strategy = IAllocationStrategy(address(0)); // Set to a default or require it to be set later
        s.criteriaNames = params.criteria;
        s.criteriaWeights = new uint32[](params.criteria.length);
        s.createdAt = block.timestamp;
        s.state = IPrizeCore.State.Setup;

        emit PrizeCreated(msg.sender, prizeAddr, params.name, params.pool);
        return prizeAddr;
    }

    function getPrizeCount() external view override returns (uint256) {
        return LibAppStorage.diamondStorage().prizeCount;
    }

    function getPrizeDetails(uint256 index) external view override returns (PrizeDetails memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(index < s.prizeCount, "Invalid index");

        PrizeInfo storage prize = s.prizes[index];

        return
            PrizeDetails({
                addr: address(this), // Since we don't store individual addresses, we use the contract address
                name: prize.name,
                description: prize.description,
                pool: prize.monetaryRewardPool,
                status: uint8(prize.state),
                allocationStrategy: address(s.strategy), // Assuming the strategy is global for all prizes
                criteriaNames: s.criteriaNames, // Assuming criteria are global for all prizes
                createdAt: s.createdAt, // Assuming creation time is global for all prizes
                organizer: prize.organizer
            });
    }

    function getPrizes() external view override returns (PrizeDetails[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeDetails[] memory prizeDetails = new PrizeDetails[](s.prizeCount);
        for (uint256 i = 0; i < s.prizeCount; i++) {
            PrizeInfo storage prize = s.prizes[i];
            prizeDetails[i] = PrizeDetails({
                addr: address(this), // Since we don't store individual addresses, we use the contract address
                name: prize.name,
                description: prize.description,
                pool: prize.monetaryRewardPool,
                status: uint8(prize.state),
                allocationStrategy: address(s.strategy), // Assuming the strategy is global for all prizes
                criteriaNames: s.criteriaNames, // Assuming criteria are global for all prizes
                createdAt: s.createdAt, // Assuming creation time is global for all prizes
                organizer: prize.organizer
            });
        }
        return prizeDetails;
    }

    function setPrizeContracts(
        address prizeAddr,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    ) external override onlyPrizeManager {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.prizeContributionContract = contributionContract;
        s.prizeEvaluationContract = evaluationContract;
        s.prizeRewardContract = rewardContract;
        emit PrizeContractsSet(prizeAddr, contributionContract, evaluationContract, rewardContract);
    }
}
