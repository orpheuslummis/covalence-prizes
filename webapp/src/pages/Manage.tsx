import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ContractFunctionExecutionError, formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { config } from "../config";
import { AllocationStrategy, PrizeDetails, State } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import { useParams } from "react-router-dom";

const getStrategyName = (strategy: AllocationStrategy): string => {
  return config.allocationStrategies[strategy].label;
};

export default function ManagePrizePage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-purple-800 to-purple-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Wallet Not Connected</h1>
          <p className="mb-4">Please connect your wallet to access the Manage Prize page.</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
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

    try {
      console.log("Fetching prize details for ID:", parsedPrizeId);
      const prizeDetails = await memoizedPrizeDiamond.getPrizeDetails(parsedPrizeId);
      console.log("Prize details fetched:", prizeDetails);
      console.log("Allocation strategy:", prizeDetails.strategy, typeof prizeDetails.strategy);

      setPrize(prizeDetails);

      console.log("Fetching criteria weights");
      const fetchedWeights = await memoizedPrizeDiamond.getCriteriaWeights(parsedPrizeId);
      setWeights(fetchedWeights);

      console.log("Fetching allocation strategy");
      const strategyName = getStrategyName(prizeDetails.strategy);
      console.log("Allocation strategy:", strategyName);

      console.log("Checking if user is organizer");
      if (address) {
        try {
          const isOrganizerResult = await memoizedPrizeDiamond.isPrizeOrganizer(parsedPrizeId, address);
          setIsOrganizer(isOrganizerResult);
        } catch (error) {
          console.error("Error checking if user is organizer:", error);
          setIsOrganizer(false);
        }
      } else {
        console.log("Wallet not connected, skipping organizer check");
        setIsOrganizer(false);
      }
      setIsOrganizerLoaded(true);

      setIsFunded(prizeDetails.fundedAmount >= prizeDetails.monetaryRewardPool);
      setIsLoading(false);

      // Fetch current evaluators
      const evaluatorsList = await memoizedPrizeDiamond.getPrizeEvaluators(parsedPrizeId);
      setCurrentEvaluators(evaluatorsList);

      // Adjust batch size based on remaining contributions
      const remainingContributions = prizeDetails.contributionCount - prizeDetails.lastProcessedIndex;
      setBatchSize(Number(remainingContributions >= 10n ? 10n : remainingContributions));
    } catch (error) {
      console.error("Error fetching prize details:", error);
      setError("Failed to fetch prize details. Please try again later.");
      setIsLoading(false);
    }
  }, [parsedPrizeId, memoizedPrizeDiamond, address]);

  useEffect(() => {
    if (parsedPrizeId && !isPrizesLoading) {
      fetchPrizeDetails();
    }
  }, [parsedPrizeId, isPrizesLoading, fetchPrizeDetails]);

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

  if (!prize) {
    return <div className="flex justify-center items-center h-screen text-white text-2xl">Prize not found</div>;
  }

  console.log("Allocation section conditions:", {
    isOrganizer,
    prizeState: prize?.state,
    rewardsAllocated: prize?.rewardsAllocated,
  });

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-purple-800 to-purple-900 min-h-screen text-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 text-center">Manage Prize: {prize.name}</h1>

        <ProgressBar states={stateProgress} />

        <ManagementCard title="Prize Details" className="mt-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <ManagementCard title="Fund Prize">
            <div className="space-y-2">
              <StatusItem label="Required" value={`${formatEther(prize.monetaryRewardPool)} ETH`} />
              <StatusItem label="Current" value={`${formatEther(prize.fundedAmount)} ETH`} />
              <StatusItem
                label="Status"
                value={isFunded ? "Fully Funded" : "Not Fully Funded"}
                status={isFunded ? "success" : "warning"}
              />
            </div>
            {!isFunded && prize.state === State.Setup && (
              <div className="mt-4">
                <label className="block mb-2">Fund Amount: {fundAmount} ETH</label>
                <input
                  type="range"
                  min="0"
                  max={Number(formatEther(prize.monetaryRewardPool))}
                  step="0.0001"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full"
                />
                <button
                  onClick={handleFundPrize}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 p-3 rounded-md transition duration-200 ease-in-out"
                >
                  Fund Prize
                </button>
              </div>
            )}
          </ManagementCard>

          {/* Assign Criteria Weights */}
          <ManagementCard title="Assign Criteria Weights">
            {prize.criteriaNames.length > 1 ? (
              prize.criteriaNames.map((name, index) => (
                <div key={index} className="mb-4">
                  <label className="block mb-1">{name}:</label>
                  <input
                    type="number"
                    value={weights[index] || ""}
                    onChange={(e) => handleWeightChange(index, e.target.value)}
                    className="w-full p-3 text-gray-900 bg-white rounded-md shadow-sm focus:ring-2 focus:ring-purple-500"
                    min="0"
                    max="10"
                  />
                </div>
              ))
            ) : (
              <p className="text-yellow-400">Criteria weights cannot be changed when there is only one dimension.</p>
            )}
            <button
              onClick={handleAssignWeights}
              className={`w-full mt-2 bg-purple-600 hover:bg-purple-700 p-3 rounded-md transition duration-200 ease-in-out ${prize.criteriaNames.length <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={prize.criteriaNames.length <= 1}
            >
              Assign Weights
            </button>
          </ManagementCard>

          {/* Manage Evaluators */}
          <ManagementCard title="Manage Evaluators">
            <h3 className="font-semibold mb-2">Current Evaluators:</h3>
            <ul className="list-disc list-inside mb-4">
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
              className="w-full p-3 text-gray-900 bg-white rounded-md shadow-sm focus:ring-2 focus:ring-purple-500"
              rows={4}
            />
            <button
              onClick={handleAddEvaluators}
              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 p-3 rounded-md transition duration-200 ease-in-out"
            >
              Add Evaluators
            </button>
          </ManagementCard>

          {/* Move to Next State */}
          <ManagementCard title={`Current State: ${State[prize.state]}`}>
            <div className="current-state-card">
              <h3 className="current-state-title">Current State: {State[prize.state]}</h3>
              <div className="current-state-content">
                <p className="mb-6">{getNextStateRequirements()}</p>
                <button
                  onClick={handleMoveToNextState}
                  disabled={!canMoveToNextState()}
                  className={`current-state-button ${!canMoveToNextState() ? "current-state-button-disabled" : ""}`}
                >
                  Move to Next State
                </button>
              </div>
            </div>
          </ManagementCard>
        </div>

        {isOrganizer && prize?.state === State.Allocating && (
          <ManagementCard title="Allocate Rewards" className="mt-12">
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Batch Size:</label>
                <input
                  type="number"
                  min="1"
                  max={Number(prize.contributionCount - (prize.lastProcessedIndex || 0n))}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full p-3 text-gray-900 bg-white rounded-md shadow-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleAllocateRewards}
                className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-md transition duration-200 ease-in-out"
                disabled={allocationInProgress || prize.rewardsAllocated}
              >
                {allocationInProgress ? "Allocating..." : "Allocate Rewards"}
              </button>
              <div className="mt-4">
                <p>
                  Allocated {prize.lastProcessedIndex.toString()} out of {prize.contributionCount.toString()}{" "}
                  contributions.
                </p>
                {!prize.rewardsAllocated && prize.lastProcessedIndex < prize.contributionCount && (
                  <p className="text-yellow-400">Allocation in progress...</p>
                )}
                {prize.rewardsAllocated && <p className="text-green-400">All rewards have been allocated.</p>}
              </div>
            </div>
          </ManagementCard>
        )}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  states: Array<{
    state: State;
    active: boolean;
    completed: boolean;
  }>;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ states }) => {
  return (
    <div className="progress-bar">
      {states.map((item, index) => (
        <div key={item.state} className="progress-step">
          <div
            className={`progress-circle ${
              item.active
                ? "progress-circle-active"
                : item.completed
                  ? "progress-circle-completed"
                  : "progress-circle-inactive"
            }`}
          >
            {item.completed ? <CheckIcon className="w-8 h-8" /> : <span>{index + 1}</span>}
          </div>
          <span
            className={`progress-label ${
              item.active
                ? "progress-label-active"
                : item.completed
                  ? "progress-label-completed"
                  : "progress-label-inactive"
            }`}
          >
            {State[item.state]}
          </span>
          {index < states.length - 1 && (
            <div className={`progress-connector ${item.completed ? "progress-connector-completed" : ""}`}></div>
          )}
        </div>
      ))}
    </div>
  );
};

interface ManagementCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ManagementCard: React.FC<ManagementCardProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`bg-purple-800 rounded-lg p-6 shadow-lg ${className}`}>
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
};

interface StatusItemProps {
  label: string;
  value: string | number;
  status?: "default" | "success" | "warning" | "error";
}

const StatusItem: React.FC<StatusItemProps> = ({ label, value, status = "default" }) => {
  const statusColors: Record<string, string> = {
    default: "text-white",
    success: "text-green-400",
    warning: "text-yellow-400",
    error: "text-red-400",
  };

  return (
    <div className="flex justify-between items-center py-2 px-4 bg-purple-700 rounded-md">
      <span className="font-medium">{label}: </span>
      <span className={`${statusColors[status]} truncate max-w-xs`}>{value}</span>
    </div>
  );
};

const CheckIcon: React.FC<{ className: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
};
