// src/pages/PrizePage.tsx

import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { State } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import PrizeDetailsComponent from "../components/PrizeDetails";
import ContributionList from "../components/ContributionList";
import toast from "react-hot-toast";
import FractalPatternBackground from "../components/FractalPatternBackground";

const PrizePage: React.FC = () => {
  const { prizeId } = useParams<{ prizeId: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { prizeDiamond } = useAppContext();

  const prizeIdBigInt = useMemo(() => {
    return prizeId !== undefined && prizeId !== null ? BigInt(prizeId) : undefined;
  }, [prizeId]);

  const {
    data: prizeDetails,
    isLoading,
    error,
    refetch: refetchPrizeDetails,
  } = useQuery({
    queryKey: ["prizeDetails", prizeIdBigInt?.toString()],
    queryFn: async () => {
      if (prizeIdBigInt === undefined) throw new Error("Invalid prize ID");
      return prizeDiamond.getPrizeDetails(prizeIdBigInt);
    },
    enabled: prizeIdBigInt !== undefined && !!prizeDiamond,
    staleTime: 30000, // 30 seconds
  });

  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ["prizeRoles", prizeIdBigInt?.toString(), address],
    queryFn: async () => {
      if (!prizeIdBigInt || !address || !prizeDetails) {
        throw new Error("Invalid prize ID, address, or prize not found");
      }
      const canEvaluate = await prizeDiamond.isPrizeEvaluator(prizeIdBigInt, address);
      const canManagePrize = await prizeDiamond.isPrizeOrganizer(prizeIdBigInt, address);
      return { canEvaluate, canManagePrize };
    },
    enabled: !!prizeIdBigInt && !!address && isConnected && !!prizeDetails,
    retry: 3,
  });

  const { data: claimableReward, refetch: refetchClaimableReward } = useQuery({
    queryKey: ["claimableReward", prizeIdBigInt?.toString(), address],
    queryFn: async () => {
      if (!prizeIdBigInt || !address) return false;
      return prizeDiamond.hasClaimableReward(prizeIdBigInt, address);
    },
    enabled: !!prizeIdBigInt && !!address && prizeDetails?.state === State.Claiming,
  });

  const handleClaimReward = useCallback(async () => {
    if (!prizeIdBigInt) return;
    try {
      await prizeDiamond.computeContestantClaimRewardAsync({ prizeId: prizeIdBigInt });
      toast.success("Reward claimed successfully!");
      refetchClaimableReward();
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward. Please try again.");
    }
  }, [prizeIdBigInt, prizeDiamond, refetchClaimableReward]);

  const handleViewClaimReward = useCallback(async () => {
    if (!prizeIdBigInt) return;
    try {
      console.log("Attempting to view claimed reward for prize:", prizeIdBigInt.toString());
      console.log("Current address:", address);

      const reward = await prizeDiamond.viewAndDecryptClaimedReward(prizeIdBigInt);
      console.log("Received decrypted reward:", reward);
      toast.success(`Claimed reward: ${formatEther(reward)} ETH`);
    } catch (error) {
      console.error("Error viewing claimed reward:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      toast.error("Failed to view claimed reward. Please check console for details.");
    }
  }, [prizeIdBigInt, prizeDiamond, address]);

  if (isLoading) {
    return <div className="text-center py-10 text-neutral-100">Loading prize details...</div>;
  }

  if (error) {
    console.error("Error fetching prize details:", error);
    return (
      <div className="text-center py-10 text-neutral-100">Error loading prize details. Please try again later.</div>
    );
  }

  if (!prizeDetails) {
    return (
      <div className="text-center py-10 text-neutral-100">Prize not found. Please check the ID and try again.</div>
    );
  }

  return (
    <div className="container-default">
      <div className="bg-neutral-50 rounded-xl shadow-lg overflow-hidden text-neutral-800">
        <div className="prize-page-header relative h-72">
          <FractalPatternBackground prize={prizeDetails} />
          <div className="absolute inset-0 bg-black opacity-40"></div>
          <div className="relative z-10 flex flex-col justify-center items-center h-full text-center px-4">
            <h1 className="prize-page-title text-4xl font-bold text-white bg-black bg-opacity-50 px-3 py-1 rounded">
              {prizeDetails.name || "Unnamed Prize"}
            </h1>
            <p className="prize-page-description mt-4 text-xl text-white bg-black bg-opacity-50 px-3 py-1 rounded">
              {prizeDetails.description || "No description available"}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {isConnected && prizeIdBigInt !== undefined && prizeDetails && (
            <>
              {/* Check if any actions are available */}
              {(prizeDetails.state === State.Open ||
                roles?.canEvaluate ||
                roles?.canManagePrize ||
                prizeDetails.organizer.toLowerCase() === address?.toLowerCase() ||
                claimableReward) && (
                <div className="bg-primary-100 rounded-lg p-4">
                  <h2 className="text-2xl font-semibold text-primary-800 mb-4">Actions</h2>
                  <div className="flex flex-wrap gap-4">
                    {prizeDetails.state === State.Open && (
                      <Link to={`/prize/${prizeIdBigInt.toString()}/submit`} className="button-primary">
                        Submit Contribution
                      </Link>
                    )}
                    {roles?.canEvaluate && prizeDetails.state !== State.Open && (
                      <Link to={`/prize/${prizeIdBigInt.toString()}/evaluator`} className="button-secondary">
                        Evaluate Contributions
                      </Link>
                    )}
                    {(roles?.canManagePrize || prizeDetails.organizer.toLowerCase() === address?.toLowerCase()) && (
                      <button
                        className="button-primary"
                        onClick={() => navigate(`/prize/${prizeIdBigInt.toString()}/manage`)}
                      >
                        Manage Prize
                      </button>
                    )}
                    {claimableReward && (
                      <button
                        onClick={handleClaimReward}
                        className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-2 px-4 rounded"
                      >
                        Claim Reward
                      </button>
                    )}
                    {claimableReward && (
                      <button
                        onClick={handleViewClaimReward}
                        className="bg-neutral-200 text-neutral-700 font-semibold py-2 px-4 rounded hover:bg-neutral-300 ml-2"
                      >
                        View Claimed Reward
                      </button>
                    )}
                  </div>
                  {rolesLoading && <p>Loading roles...</p>}
                  {rolesError && <p>Error loading roles. Please try again.</p>}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <PrizeDetailsComponent prize={prizeDetails} />
              <EvaluationCriteria criteria={prizeDetails.criteriaNames || []} />
            </div>
            <div>
              <PrizeAmount amount={prizeDetails.monetaryRewardPool} />
              <PrizeInPageStatus currentState={prizeDetails.state} />
            </div>
          </div>

          {prizeIdBigInt !== undefined && (
            <div>
              <h2 className="text-2xl font-semibold text-primary-800 mb-4">Contributions</h2>
              <ContributionList prizeId={prizeIdBigInt} refetchPrizeDetails={refetchPrizeDetails} />
            </div>
          )}

          <div className="bg-primary-50 rounded-lg p-4 mt-8">
            <h2 className="text-2xl font-semibold text-primary-800 mb-4">Evaluator Status</h2>
            {roles?.canEvaluate ? (
              <p className="text-accent-500 font-semibold">You are an evaluator for this prize</p>
            ) : (
              <p className="text-neutral-600">You are not an evaluator for this prize</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EvaluationCriteria: React.FC<{ criteria: string[] }> = ({ criteria }) => {
  return (
    <div className="bg-neutral-50 rounded-lg shadow p-6 mt-8">
      <h2 className="text-2xl font-semibold text-primary-800 mb-4">Evaluation Criteria</h2>
      {criteria && criteria.length > 0 ? (
        <ul className="list-disc pl-5 space-y-2">
          {criteria.map((criterion, index) => (
            <li key={index} className="text-neutral-700">
              {criterion}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-600">No evaluation criteria specified.</p>
      )}
    </div>
  );
};

const PrizeAmount: React.FC<{ amount: bigint }> = ({ amount }) => {
  return (
    <div className="bg-neutral-50 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold text-primary-800 mb-4">Prize Amount</h2>
      <p className="text-3xl font-bold text-primary-600">{formatEther(amount)} ETH</p>
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
    <div className="bg-neutral-50 rounded-lg shadow p-6 mt-6">
      <h2 className="text-2xl font-semibold text-primary-800 mb-4">Prize Status</h2>
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

export default PrizePage;
