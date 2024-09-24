import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { State, PrizeDetails } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import PrizeDetailsComponent from "../components/PrizeDetails";
import ContributionList from "../components/ContributionList";
import toast from "react-hot-toast";

const PrizePage: React.FC = () => {
  const { prizeId } = useParams<{ prizeId: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { prizeDiamond } = useAppContext();

  const [isLoading, setIsLoading] = useState(true);
  const [prize, setPrize] = useState<PrizeDetails | undefined>(undefined);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [claimedReward, setClaimedReward] = useState<bigint | null>(null);
  const prizeIdBigInt = useMemo(() => BigInt(prizeId || "0"), [prizeId]);

  const { data: roles, error: rolesError } = useQuery({
    queryKey: ["prizeRoles", prizeIdBigInt?.toString(), address],
    queryFn: async () => {
      if (!prizeIdBigInt || !address || !prize) {
        throw new Error("Invalid prize ID, address, or prize not found");
      }
      const canSubmit = prize.organizer.toLowerCase() === address.toLowerCase();
      const canEvaluate = await prizeDiamond.isPrizeEvaluator(prizeIdBigInt, address);
      const canManagePrize = await prizeDiamond.isPrizeOrganizer(prizeIdBigInt, address);
      return { canSubmit, canEvaluate, canManagePrize };
    },
    enabled: !!prizeIdBigInt && !!address && isConnected && !!prize,
  });

  const {
    data: prizeDetails,
    refetch: refetchPrizeDetails,
    error: prizeDetailsError,
  } = useQuery({
    queryKey: ["prizeDetails", prizeIdBigInt?.toString()],
    queryFn: async () => {
      if (!prizeIdBigInt) throw new Error("Invalid prize ID");
      console.log("Fetching prize details for ID:", prizeIdBigInt.toString());
      const result = await prizeDiamond.getPrizeDetails(prizeIdBigInt);
      console.log("Fetched prize details:", result);
      return result as PrizeDetails;
    },
    enabled: !!prizeIdBigInt,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: claimableReward, refetch: refetchClaimableReward } = useQuery({
    queryKey: ["claimableReward", prizeIdBigInt?.toString(), address],
    queryFn: async () => {
      if (!prizeIdBigInt || !address) return false;
      return await prizeDiamond.hasClaimableReward(prizeIdBigInt, address);
    },
    enabled: !!prizeIdBigInt && !!address && prizeDetails?.state === State.Claiming,
  });

  useEffect(() => {
    if (prizeIdBigInt) {
      refetchPrizeDetails();
    }
  }, [prizeIdBigInt, refetchPrizeDetails]);

  useEffect(() => {
    if (prizeDetails) {
      console.log("Prize details:", prizeDetails);
      console.log("Contribution count:", prizeDetails.contributionCount.toString());
      setPrize(prizeDetails);
      setIsOrganizer(prizeDetails.organizer.toLowerCase() === address?.toLowerCase());
    }
  }, [prizeDetails, address]);

  useEffect(() => {
    setCanClaim(!!claimableReward);
  }, [claimableReward]);

  useEffect(() => {
    setIsLoading(!prizeDetails);
  }, [prizeDetails]);

  const handleClaimReward = useCallback(async () => {
    if (!prizeIdBigInt) return;
    try {
      await prizeDiamond.computeContestantClaimRewardAsync({ prizeId: prizeIdBigInt });
      toast.success("Reward claimed successfully!");
      setCanClaim(false);
      refetchClaimableReward();
      refetchPrizeDetails();
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward. Please try again.");
    }
  }, [prizeIdBigInt, prizeDiamond, refetchClaimableReward, refetchPrizeDetails]);

  const handleViewClaimReward = useCallback(async () => {
    if (!prizeIdBigInt) return;
    try {
      const reward = await prizeDiamond.viewAndDecryptClaimedReward(prizeIdBigInt);
      setClaimedReward(reward);
      toast.success("Claimed reward retrieved successfully");
    } catch (error) {
      console.error("Error viewing claimed reward:", error);
      toast.error("Failed to view claimed reward. Please try again.");
    }
  }, [prizeIdBigInt, prizeDiamond]);

  if (!prize && !prizeDetails) {
    console.error("Prize not found. Prize:", prize, "PrizeDetails:", prizeDetails);
    return <div className="text-center py-10 text-purple-100">Prize not found. Please check the ID and try again.</div>;
  }

  const displayPrize = prize || prizeDetails;

  if (!displayPrize) {
    console.error("Unable to display prize information. Prize:", prize, "PrizeDetails:", prizeDetails);
    return <div className="text-center py-10 text-purple-100">Unable to display prize information.</div>;
  }

  console.log("Rendering prize data:", displayPrize);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden text-gray-800">
        <div className="prize-card-header" style={generateGradient(displayPrize)}>
          <div className="prize-card-header-content">
            <h1 className="prize-card-title text-4xl">{displayPrize.name || "Unnamed Prize"}</h1>
            <p className="prize-card-description text-xl">{displayPrize.description || "No description available"}</p>
          </div>
          <div className="prize-card-header-overlay"></div>
        </div>

        <div className="p-6 space-y-8">
          {isConnected && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h2 className="text-2xl font-semibold text-purple-800 mb-4">Actions</h2>
              <div className="flex flex-wrap gap-4">
                {roles?.canSubmit && displayPrize.state === State.Open && (
                  <Link to={`/prize/${prizeId}/submit`} className="button-primary">
                    Submit Contribution
                  </Link>
                )}
                {roles?.canEvaluate && (
                  <button
                    className={`button-primary ${displayPrize.state !== State.Evaluating ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => displayPrize.state === State.Evaluating && navigate(`/prize/${prizeId}/evaluate`)}
                    disabled={displayPrize.state !== State.Evaluating}
                  >
                    Evaluate Contributions
                  </button>
                )}
                {isOrganizer && (
                  <button className="button-primary" onClick={() => navigate(`/prize/${prizeId}/manage`)}>
                    Manage Prize
                  </button>
                )}
                {canClaim && (
                  <button onClick={handleClaimReward} className="button-primary">
                    Claim Reward
                  </button>
                )}
                {canClaim && (
                  <button onClick={handleViewClaimReward} className="button-secondary ml-2">
                    View Claimed Reward
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <PrizeDetailsComponent prize={displayPrize} />
              <EvaluationCriteria criteria={displayPrize.criteriaNames || []} />
            </div>
            <div>
              <PrizeAmount amount={displayPrize.monetaryRewardPool} />
              <PrizeInPageStatus currentState={displayPrize.state} />
            </div>
          </div>

          {prizeIdBigInt !== undefined && (
            <div>
              <h2 className="text-2xl font-semibold text-purple-800 mb-4">Contributions</h2>
              <ContributionList prizeId={prizeIdBigInt} key={`contributions-${displayPrize.contributionCount}`} />
            </div>
          )}

          <div className="bg-purple-50 rounded-lg p-4 mt-8">
            <h2 className="text-2xl font-semibold text-purple-800 mb-4">Evaluator Status</h2>
            {roles?.canEvaluate ? (
              <p className="text-green-600 font-semibold">You are an evaluator for this prize</p>
            ) : (
              <p className="text-gray-600">You are not an evaluator for this prize</p>
            )}
          </div>

          {claimedReward !== null && (
            <div className="mt-4 p-4 bg-purple-100 rounded-lg">
              <h3 className="text-xl font-semibold text-purple-800">Your Claimed Reward</h3>
              <p className="text-2xl font-bold text-purple-600">{formatEther(claimedReward)} ETH</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EvaluationCriteria: React.FC<{ criteria: string[] }> = ({ criteria }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-8">
      <h2 className="text-2xl font-semibold text-purple-800 mb-4">Evaluation Criteria</h2>
      {criteria && criteria.length > 0 ? (
        <ul className="list-disc pl-5 space-y-2">
          {criteria.map((criterion, index) => (
            <li key={index} className="text-gray-700">
              {criterion}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No evaluation criteria specified.</p>
      )}
    </div>
  );
};

const PrizeAmount: React.FC<{ amount: bigint }> = ({ amount }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold text-purple-800 mb-4">Prize Amount</h2>
      <p className="text-3xl font-bold text-purple-600">{formatEther(amount)} ETH</p>
    </div>
  );
};

const PrizeInPageStatus: React.FC<{ currentState: State }> = ({ currentState }) => {
  const stateLabels: Record<State, string> = {
    [State.Setup]: "Setup",
    [State.Open]: "Open",
    [State.Evaluating]: "Evaluating",
    [State.Allocating]: "Allocating",
    [State.Claiming]: "Claiming",
    [State.Closed]: "Closed",
  };

  const statusColors: Record<State, string> = {
    [State.Setup]: "bg-yellow-100 text-yellow-800",
    [State.Open]: "bg-green-200 text-green-800",
    [State.Evaluating]: "bg-orange-100 text-orange-800",
    [State.Allocating]: "bg-pink-100 text-pink-800",
    [State.Claiming]: "bg-indigo-100 text-indigo-800",
    [State.Closed]: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-2xl font-semibold text-purple-800 mb-4">Prize Status</h2>
      <div className="space-y-2">
        {Object.values(State)
          .filter((value) => typeof value === "number")
          .map((state) => {
            const numericState = state as State;
            return (
              <div
                key={numericState}
                className={`flex items-center p-2 rounded-md ${
                  currentState === numericState
                    ? `${statusColors[numericState]} font-semibold`
                    : "bg-gray-50 text-gray-500"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    currentState === numericState ? "bg-current" : "bg-gray-300"
                  }`}
                ></div>
                <span>{stateLabels[numericState]}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

const generateGradient = (prize: PrizeDetails) => {
  const colors = [
    "#FF5733",
    "#FFBD33",
    "#FFF133",
    "#99FF33",
    "#33FF57",
    "#33FFBD",
    "#33FFFF",
    "#3399FF",
    "#3333FF",
    "#BD33FF",
    "#FF33BD",
    "#FF3366",
  ];
  const index = prize.id % BigInt(colors.length);
  const startColor = colors[Number(index)];
  const endColor = colors[(Number(index) + 1) % colors.length];
  return {
    background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
  };
};

export default PrizePage;
