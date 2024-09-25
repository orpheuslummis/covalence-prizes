// src/pages/ManagePrizePage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ContractFunctionExecutionError, formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { config } from "../config";
import { AllocationStrategy, PrizeDetails, State } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import { Link, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import ManagementCard from "../components/ManagementCard";
import StatusItem from "../components/StatusItem";

const getStrategyName = (strategy: AllocationStrategy): string => {
  return config.allocationStrategies[strategy].label;
};

export default function ManagePrizePage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-primary-800 to-primary-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Wallet Not Connected</h1>
          <p className="mb-4">Please connect your wallet to access the Manage Prize page.</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="button-primary"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { prizeId } = useParams<{ prizeId: string }>();
  const { address } = useAccount();
  const { prizeDiamond, isPrizesLoading, prizes, allocateRewardsBatch, getAllocationDetails } = useAppContext();

  const memoizedPrizeDiamond = useMemo(() => prizeDiamond, [prizeDiamond]);

  const [prize, setPrize] = useState<PrizeDetails | null>(null);
  const [weights, setWeights] = useState<number[]>([]);
  const [evaluators, setEvaluators] = useState<string>("");
  const [fundAmount, setFundAmount] = useState<string>("0.0001");
  const [isOrganizer, setIsOrganizer] = useState<boolean>(false);
  const [isOrganizerLoaded, setIsOrganizerLoaded] = useState<boolean>(false);
  const [isFunded, setIsFunded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEvaluators, setCurrentEvaluators] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [allocationInProgress, setAllocationInProgress] = useState<boolean>(false);
  const [allocationDetails, setAllocationDetails] = useState<{
    lastProcessedIndex: bigint;
    contributionCount: bigint;
    rewardsAllocated: boolean;
  } | null>(null);

  const parsedPrizeId = useMemo(() => (prizeId ? BigInt(prizeId as string) : undefined), [prizeId]);

  useEffect(() => {
    console.log("ManagePrizePage: Component mounted");
    console.log("prizeId:", prizeId);
    console.log("isPrizesLoading:", isPrizesLoading);
    console.log("prizes:", prizes);
  }, [prizeId, isPrizesLoading, prizes]);

  const fetchPrizeDetails = useCallback(async () => {
    if (!parsedPrizeId || !memoizedPrizeDiamond) return;

    setIsLoading(true);
    try {
      const [prizeDetails, fetchedWeights, isOrganizerResult, evaluatorsList, allocationDetails] = await Promise.all([
        memoizedPrizeDiamond.getPrizeDetails(parsedPrizeId),
        memoizedPrizeDiamond.getCriteriaWeights(parsedPrizeId),
        address ? memoizedPrizeDiamond.isPrizeOrganizer(parsedPrizeId, address) : false,
        memoizedPrizeDiamond.getPrizeEvaluators(parsedPrizeId),
        memoizedPrizeDiamond.getAllocationDetails(parsedPrizeId),
      ]);

      setPrize(prizeDetails);
      setWeights(fetchedWeights);
      setIsOrganizer(isOrganizerResult);
      setIsOrganizerLoaded(true);
      setCurrentEvaluators(evaluatorsList);
      setAllocationDetails(allocationDetails);

      const remainingContributions = prizeDetails.contributionCount - prizeDetails.lastProcessedIndex;
      setBatchSize(Number(remainingContributions >= 10n ? 10n : remainingContributions));
    } catch (error) {
      console.error("Error fetching prize details:", error);
      setError("Failed to fetch prize details. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [parsedPrizeId, memoizedPrizeDiamond, address]);

  useEffect(() => {
    if (parsedPrizeId && !isPrizesLoading) {
      fetchPrizeDetails();
    }
  }, [parsedPrizeId, isPrizesLoading, fetchPrizeDetails]);

  useEffect(() => {
    console.log("isOrganizer:", isOrganizer);
    console.log("prize:", prize);
    console.log("address:", address);
  }, [isOrganizer, prize, address]);

  useEffect(() => {
    console.log("Current state:", {
      prize,
      weights,
      isOrganizer,
      isOrganizerLoaded,
      isFunded,
      isLoading,
      error,
    });
  }, [prize, weights, isOrganizer, isOrganizerLoaded, isFunded, isLoading, error]);

  const handleWeightChange = useCallback((index: number, value: string) => {
    setWeights((prevWeights) => {
      const newWeights = [...prevWeights];
      newWeights[index] = parseInt(value, 10);
      return newWeights;
    });
  }, []);

  const handleAssignWeights = useCallback(async () => {
    try {
      if (!parsedPrizeId) {
        toast.error("Invalid Prize ID");
        return;
      }

      const loadingToast = toast.loading("Assigning criteria weights...");

      await memoizedPrizeDiamond.assignCriteriaWeightsAsync({
        prizeId: parsedPrizeId!,
        weights,
      });

      toast.dismiss(loadingToast);
      toast.success("Criteria weights assigned successfully");
      await fetchPrizeDetails();
    } catch (error) {
      console.error("Error assigning weights:", error);
      toast.error("Failed to assign weights");
    }
  }, [parsedPrizeId, weights, memoizedPrizeDiamond, fetchPrizeDetails]);

  const handleFundPrize = useCallback(async () => {
    if (isFunded) {
      toast.error("Prize is already funded");
      return;
    }
    try {
      const amount = parseEther(fundAmount);
      const loadingToast = toast.loading("Funding prize...");

      await memoizedPrizeDiamond.fundTotallyAsync({ prizeId: parsedPrizeId!, amount });

      toast.dismiss(loadingToast);
      toast.success("Prize funded successfully");
      await fetchPrizeDetails();
      setIsFunded(true);
    } catch (error) {
      console.error("Error funding prize:", error);
      toast.error("Failed to fund prize: " + (error instanceof Error ? error.message : String(error)));
    }
  }, [memoizedPrizeDiamond, fundAmount, parsedPrizeId, isFunded, fetchPrizeDetails]);

  const handleAddEvaluators = useCallback(async () => {
    try {
      if (prize?.state !== State.Setup) {
        toast.error("Evaluators can only be added during the Setup state");
        return;
      }

      const evaluatorAddresses = evaluators.split(",").map((addr) => {
        const trimmed = addr.trim();
        if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
          throw new Error(`Invalid Ethereum address: ${trimmed}`);
        }
        return trimmed as `0x${string}`;
      });

      const loadingToast = toast.loading("Adding evaluators...");

      await memoizedPrizeDiamond.addEvaluatorsAsync({
        prizeId: parsedPrizeId!,
        evaluators: evaluatorAddresses,
      });

      toast.dismiss(loadingToast);
      toast.success("Evaluators added successfully");
      setEvaluators("");

      const updatedEvaluators = await memoizedPrizeDiamond.getPrizeEvaluators(parsedPrizeId!);
      setCurrentEvaluators(updatedEvaluators);
    } catch (error) {
      console.error("Error adding evaluators:", error);
      toast.error("Failed to add evaluators: " + (error instanceof Error ? error.message : String(error)));
    }
  }, [memoizedPrizeDiamond, evaluators, parsedPrizeId, prize?.state]);

  const canMoveToNextState = useCallback(() => {
    if (!prize) return false;

    switch (prize.state) {
      case State.Setup:
        return prize.fundedAmount >= prize.monetaryRewardPool && prize.strategy !== AllocationStrategy.Invalid;
      case State.Open:
        return prize.contributionCount > 0n;
      case State.Evaluating:
        console.log("Evaluated Contributions:", prize.evaluatedContributionsCount);
        console.log("Total Contributions:", Number(prize.contributionCount));
        return prize.evaluatedContributionsCount === Number(prize.contributionCount);
      case State.Allocating:
        return prize.rewardsAllocated;
      case State.Claiming:
        return prize.claimedRewardsCount === Number(prize.contributionCount);
      default:
        return false;
    }
  }, [prize]);

  const getNextStateRequirements = useCallback(() => {
    if (!prize) return "";

    switch (prize.state) {
      case State.Setup:
        return "Prize must be fully funded and have a valid allocation strategy.";
      case State.Open:
        return "At least one contribution is required.";
      case State.Evaluating:
        return "All contributions must be evaluated.";
      case State.Allocating:
        return "Rewards must be allocated.";
      case State.Claiming:
        return "All rewards must be claimed.";
      default:
        return "Cannot move to next state.";
    }
  }, [prize]);

  const handleMoveToNextState = useCallback(async () => {
    if (!canMoveToNextState()) {
      toast.error(getNextStateRequirements());
      return;
    }

    try {
      const loadingToast = toast.loading("Moving to next state...");

      await memoizedPrizeDiamond.moveToNextStateAsync({ prizeId: parsedPrizeId! });

      toast.dismiss(loadingToast);
      toast.success("Moved to next state successfully");

      await fetchPrizeDetails();

      // Instead of navigating, we'll refresh the current page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error moving to next state:", error);
      if (error instanceof ContractFunctionExecutionError) {
        toast.error(`Failed to move to next state: ${error.message}`);
      } else {
        toast.error("Failed to move to next state");
      }
    }
  }, [canMoveToNextState, getNextStateRequirements, memoizedPrizeDiamond, parsedPrizeId, fetchPrizeDetails]);

  const stateProgress = useMemo(() => {
    const states = [State.Setup, State.Open, State.Evaluating, State.Allocating, State.Claiming, State.Closed];
    return states.map((state) => ({
      state,
      active: prize?.state === state,
      completed: states.indexOf(state) < states.indexOf(prize?.state || State.Setup),
    }));
  }, [prize?.state]);

  useEffect(() => {
    if (prize) {
      setFundAmount(formatEther(prize.monetaryRewardPool));
      setIsFunded(prize.fundedAmount >= prize.monetaryRewardPool);
    }
  }, [prize]);

  const handleAllocateRewards = useCallback(async () => {
    if (!parsedPrizeId) {
      toast.error("Invalid Prize ID");
      return;
    }

    if (batchSize <= 0) {
      toast.error("Batch size must be greater than zero");
      return;
    }

    const remainingContributions = BigInt(prize?.contributionCount || 0n) - BigInt(prize?.lastProcessedIndex || 0n);

    if (BigInt(batchSize) > remainingContributions) {
      toast.error(`Batch size cannot exceed remaining contributions (${remainingContributions})`);
      return;
    }

    setAllocationInProgress(true);

    try {
      await allocateRewardsBatch({
        prizeId: parsedPrizeId,
        batchSize: BigInt(batchSize),
      });
      toast.success(`Successfully allocated rewards for ${batchSize} contributions`);

      // Refetch prize details and allocation details
      await fetchPrizeDetails();
      const updatedDetails = await getAllocationDetails(parsedPrizeId);
      setAllocationDetails(updatedDetails);
    } catch (error: any) {
      console.error("Allocation error:", error);
      toast.error(`Failed to allocate rewards: ${error.message || String(error)}`);
    } finally {
      setAllocationInProgress(false);
    }
  }, [allocateRewardsBatch, batchSize, parsedPrizeId, prize, getAllocationDetails, fetchPrizeDetails]);

  useEffect(() => {
    const fetchAllocationDetails = async () => {
      if (parsedPrizeId) {
        const details = await getAllocationDetails(parsedPrizeId);
        setAllocationDetails(details);
      }
    };

    fetchAllocationDetails();
  }, [parsedPrizeId, getAllocationDetails]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-white text-2xl">Loading prize data...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500 text-2xl">{error}</div>;
  }

  if (!prize && !isLoading) {
    return <div className="flex justify-center items-center h-screen text-white text-2xl">Prize not found</div>;
  }

  console.log("Allocation section conditions:", {
    isOrganizer,
    prizeState: prize?.state,
    rewardsAllocated: prize?.rewardsAllocated,
    allocationDetails: allocationDetails, // Log allocation details
  });

  if (!prize) {
    return <div className="flex justify-center items-center h-screen text-white text-2xl">Prize not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-primary-100 via-primary-300 to-primary-500 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-4">
          <Link to={`/prize/${prizeId}`} className="text-primary-700 hover:underline">
            Back to Prize
          </Link>
        </div>

        <h1 className="text-5xl font-bold mb-8 text-center text-primary-900">Manage Prize: {prize.name}</h1>

        {/* Unified ProgressBar with State Management */}
        <ProgressBar
          states={stateProgress}
          currentState={{
            state: prize.state,
            requirements: getNextStateRequirements(),
            canMoveToNext: canMoveToNextState(),
            handleMoveToNextState,
          }}
        />

        {/* Prize Details */}
        <ManagementCard title="Prize Details" className="mt-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
            <StatusItem label="Organizer" value={prize.organizer} />
            <StatusItem label="Created At" value={new Date(Number(prize.createdAt) * 1000).toLocaleDateString()} />
            <StatusItem label="Allocation Strategy" value={getStrategyName(prize.strategy)} />
            <StatusItem label="State" value={State[prize.state]} />
            <StatusItem label="Contributions" value={prize.contributionCount.toString()} />
            <StatusItem label="Evaluated Contributions" value={prize.evaluatedContributionsCount.toString()} />
          </div>
        </ManagementCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Fund Prize */}
          {isOrganizer && (
            <ManagementCard title="Fund Prize">
              <div className="space-y-2 text-white">
                <StatusItem label="Required" value={`${formatEther(prize.monetaryRewardPool)} ETH`} />
                <StatusItem label="Current" value={`${formatEther(prize.fundedAmount)} ETH`} />
                <StatusItem
                  label="Status"
                  value={isFunded ? "Fully Funded" : "Not Fully Funded"}
                  status={isFunded ? "success" : "warning"}
                />
              </div>
              {!isFunded && (
                <div className="mt-4">
                  <label className="block mb-2 text-white">Fund Amount: {fundAmount} ETH</label>
                  <input
                    type="range"
                    min="0"
                    max={Number(formatEther(prize.monetaryRewardPool))}
                    step="0.0001"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="w-full h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <button
                    onClick={handleFundPrize}
                    className="w-full mt-4 bg-accent-500 hover:bg-accent-600 text-white font-bold py-2 px-4 rounded transition duration-300"
                    disabled={isFunded}
                  >
                    {isFunded ? "Prize Fully Funded" : "Fund Prize"}
                  </button>
                </div>
              )}
            </ManagementCard>
          )}

          {/* Assign Criteria Weights */}
          <ManagementCard title="Assign Criteria Weights">
            {prize.criteriaNames.length > 1 ? (
              <>
                {prize.criteriaNames.map((name, index) => (
                  <div key={index} className="mb-4">
                    <label className="block mb-1 text-white">
                      {name}: {weights[index] || 0}
                    </label>
                    <input
                      type="range"
                      value={weights[index] || 0}
                      onChange={(e) => handleWeightChange(index, e.target.value)}
                      className="w-full h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer"
                      min="0"
                      max="10"
                      step="1"
                    />
                  </div>
                ))}
              </>
            ) : (
              <p className="text-accent-300">Criteria weights cannot be changed when there is only one dimension.</p>
            )}
            <button
              onClick={handleAssignWeights}
              className={`w-full mt-2 button-primary ${
                prize.criteriaNames.length <= 1 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={prize.criteriaNames.length <= 1}
            >
              Assign Weights
            </button>
          </ManagementCard>

          {/* Manage Evaluators */}
          <ManagementCard title="Manage Evaluators">
            <h3 className="font-semibold mb-2 text-white">Current Evaluators:</h3>
            <ul className="list-disc list-inside mb-4 text-white">
              {currentEvaluators.map((evaluator, index) => (
                <li key={index} className="truncate">
                  {evaluator}
                </li>
              ))}
            </ul>
            <textarea
              value={evaluators}
              onChange={(e) => setEvaluators(e.target.value)}
              placeholder="Enter evaluator addresses, separated by commas"
              className="w-full p-3 text-gray-900 bg-white rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 resize-none"
              rows={4}
            />
            <button
              onClick={handleAddEvaluators}
              className="w-full mt-2 button-primary"
            >
              Add Evaluators
            </button>
          </ManagementCard>
        </div>

        <ManagementCard title="Allocate Rewards" className="mt-12">
          <div>
            <label className="block mb-2 text-white">Batch Size:</label>
            <input
              type="number"
              min="1"
              max={Number(prize.contributionCount - (prize.lastProcessedIndex || 0n))}
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full p-3 text-gray-900 bg-white rounded-md shadow-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleAllocateRewards}
            className="w-full button-primary mt-4"
            disabled={allocationInProgress || prize.rewardsAllocated}
          >
            {allocationInProgress ? "Allocating..." : "Allocate Rewards"}
          </button>
          <div className="mt-4 text-white">
            <p>
              Allocated {allocationDetails?.lastProcessedIndex.toString() || "0"} out of{" "}
              {allocationDetails?.contributionCount.toString() || "0"} contributions.
            </p>
            {!allocationDetails?.rewardsAllocated &&
              (allocationDetails?.lastProcessedIndex || 0n) < (allocationDetails?.contributionCount || 0n) && (
                <p className="text-accent-300">Allocation in progress...</p>
              )}
            {allocationDetails?.rewardsAllocated && <p className="text-accent-300">All rewards have been allocated.</p>}
          </div>
        </ManagementCard>
      </div>
    </div>
  );
}
