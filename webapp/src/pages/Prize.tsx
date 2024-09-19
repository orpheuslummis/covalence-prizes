import React, { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { State, PrizeDetails } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import { useWalletContext } from "../contexts/WalletContext";
import PrizeDetailsComponent from "../components/PrizeDetails";
import ContributionList from "../components/ContributionList";

const PrizePage: React.FC = () => {
  const { prizeId } = useParams<{ prizeId: string }>();
  const { prizeDiamond, prizes, isLoading, isPrizesLoading } = useAppContext();
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const { account } = useWalletContext();
  const { address: walletAddress } = account;

  useEffect(() => {
    console.log("AppContext state:", { prizes, isLoading, isPrizesLoading });
    console.log("Wallet state:", { address, isConnected, walletAddress });
  }, [prizes, isLoading, isPrizesLoading, address, isConnected, walletAddress]);

  const prizeIdBigInt = useMemo(() => {
    const result = typeof prizeId === "string" ? BigInt(prizeId) : undefined;
    console.log("prizeIdBigInt:", result?.toString());
    return result;
  }, [prizeId]);

  const prize = useMemo(() => {
    const foundPrize = prizes?.find((p) => p.id === prizeIdBigInt);
    console.log("Found prize:", foundPrize);
    return foundPrize;
  }, [prizes, prizeIdBigInt]);

  const {
    data: roles,
    isLoading: isRolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ["prizeRoles", prizeIdBigInt?.toString(), address],
    queryFn: async () => {
      console.log("Roles query function invoked");
      if (!prizeIdBigInt || !address || !prize) {
        console.error("Invalid prize ID, address, or prize not found");
        throw new Error("Invalid prize ID, address, or prize not found");
      }
      console.log(`Checking roles for prize ${prizeIdBigInt.toString()} and address ${address}`);
      const canSubmit = prize.organizer.toLowerCase() === address.toLowerCase();
      const canEvaluate = await prizeDiamond.isPrizeEvaluator(prizeIdBigInt, address);
      console.log(`Roles for prize ${prizeIdBigInt.toString()}:`, {
        canSubmit,
        canEvaluate,
        canManagePrize: canSubmit,
      });
      return { canSubmit, canEvaluate, canManagePrize: canSubmit };
    },
    enabled: !!prizeIdBigInt && !!address && isConnected && !!prize,
  });

  useEffect(() => {
    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }
  }, [rolesError]);

  const {
    data: prizeDetails,
    isLoading: _isPrizeLoading,
  } = useQuery({
    queryKey: ["prizeDetails", prizeIdBigInt?.toString()],
    queryFn: async () => {
      if (!prizeIdBigInt) throw new Error("Invalid prize ID");
      console.log("Fetching prize details for ID:", prizeIdBigInt.toString());
      const result = await prizeDiamond.getPrizeDetails(prizeIdBigInt);
      console.log("Fetched prize details:", result);
      return result as PrizeDetails;
    },
    enabled: !!prizeIdBigInt && !prize,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: isEvaluator, isLoading: isEvaluatorLoading } = useQuery({
    queryKey: ["isEvaluator", prizeIdBigInt?.toString(), walletAddress],
    queryFn: async () => {
      if (!prizeIdBigInt || !walletAddress) {
        return false;
      }
      return await prizeDiamond.isPrizeEvaluator(prizeIdBigInt, walletAddress);
    },
    enabled: !!prizeIdBigInt && !!walletAddress,
  });

  if (isLoading || isPrizesLoading || isRolesLoading) {
    return <div className="text-center py-10 text-purple-100">Loading...</div>;
  }

  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return (
      <div className="text-center py-10 text-red-300">
        Error loading roles: {(rolesError as Error).message}
      </div>
    );
  }

  if (!prize && !prizeDetails) {
    return (
      <div className="text-center py-10 text-purple-100">
        Prize not found. Please check the ID and try again.
      </div>
    );
  }

  const displayPrize = prize || prizeDetails;

  if (!displayPrize) {
    return (
      <div className="text-center py-10 text-purple-100">
        Unable to display prize information.
      </div>
    );
  }

  console.log("Rendering prize data:", displayPrize);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="prize-card-header" style={generateGradient(displayPrize)}>
          <div className="prize-card-header-content">
            <h1 className="prize-card-title text-4xl">
              {displayPrize.name || "Unnamed Prize"}
            </h1>
            <p className="prize-card-description text-xl">
              {displayPrize.description || "No description available"}
            </p>
          </div>
          <div className="prize-card-header-overlay"></div>
        </div>

        <div className="p-6 space-y-8">
          {isConnected && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h2 className="text-2xl font-semibold text-purple-800 mb-4">Actions</h2>
              <div className="flex flex-wrap gap-4">
                {roles?.canSubmit && (
                  <button
                    className="button-primary"
                    onClick={() => navigate(`/prize/${prizeId}/submit`)}
                  >
                    Submit Contribution
                  </button>
                )}
                {roles?.canEvaluate && (
                  <button
                    className="button-primary"
                    onClick={() => navigate(`/prize/${prizeId}/evaluate`)}
                  >
                    Evaluate Contributions
                  </button>
                )}
                {roles?.canManagePrize && (
                  <button
                    className="button-primary"
                    onClick={() => navigate(`/prize/${prizeId}/manage`)}
                  >
                    Manage Prize
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

          {prizeIdBigInt !== undefined && <ContributionList prizeId={prizeIdBigInt} />}

          <div className="bg-purple-50 rounded-lg p-4 mt-8">
            <h2 className="text-2xl font-semibold text-purple-800 mb-4">Evaluator Status</h2>
            {isEvaluatorLoading ? (
              <p>Loading evaluator status...</p>
            ) : isEvaluator ? (
              <p className="text-green-600 font-semibold">
                You are an evaluator for this prize
              </p>
            ) : (
              <p className="text-gray-600">You are not an evaluator for this prize</p>
            )}
          </div>
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
      <p className="text-3xl font-bold text-purple-600">
        {formatEther(amount)} ETH
      </p>
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
        {Object.values(State).filter((value) => typeof value === "number").map((state) => {
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