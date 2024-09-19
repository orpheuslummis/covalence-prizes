import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { PrizeDetails, State } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import { Address } from "viem";

const ManagePage: React.FC = () => {
  const { prizeId } = useParams<{ prizeId: string }>();
  const { address } = useAccount();
  const { prizeDiamond, isLoading } = useAppContext();

  const [prize, setPrize] = useState<PrizeDetails | null>(null);
  const [evaluators, setEvaluators] = useState<string>("");
  const [currentEvaluators, setCurrentEvaluators] = useState<string[]>([]);

  const parsedPrizeId = useMemo(() => (prizeId ? BigInt(prizeId) : undefined), [prizeId]);
  const memoizedPrizeDiamond = useMemo(() => prizeDiamond, [prizeDiamond]);

  const fetchPrizeDetails = useCallback(async () => {
    if (!parsedPrizeId || !memoizedPrizeDiamond) return;

    try {
      const prizeDetails = await memoizedPrizeDiamond.getPrizeDetails(parsedPrizeId);
      setPrize(prizeDetails);

      if (address) {
        // const isOrganizer = await memoizedPrizeDiamond.isPrizeOrganizer(parsedPrizeId, address as Address);
        // Optionally utilize 'isPrizeOrganizer' result here
      }

      // Fetch current evaluators
      const evaluatorsList = await memoizedPrizeDiamond.getPrizeEvaluators(parsedPrizeId);
      setCurrentEvaluators(evaluatorsList);
    } catch (error) {
      console.error("Error fetching prize details:", error);
      toast.error("Failed to fetch prize details.");
    }
  }, [parsedPrizeId, memoizedPrizeDiamond, address]);

  useEffect(() => {
    if (parsedPrizeId && !isLoading) {
      fetchPrizeDetails();
    }
  }, [parsedPrizeId, isLoading, fetchPrizeDetails]);

  const handleAddEvaluators = useCallback(async () => {
    if (!parsedPrizeId) return;
    
    const evaluatorAddresses = evaluators
      .split(",")
      .map((addr) => addr.trim()) as Address[];

    try {
      await prizeDiamond.addEvaluatorsAsync({
        prizeId: parsedPrizeId,
        evaluators: evaluatorAddresses,
      });
      setEvaluators("");
      toast.success("Evaluators added successfully");
      fetchPrizeDetails();
    } catch (err) {
      console.error("Error adding evaluators:", err);
      toast.error("Failed to add evaluators");
    }
  }, [evaluators, prizeDiamond, parsedPrizeId, fetchPrizeDetails]);

  const handleMoveToNextState = useCallback(async () => {
    if (!parsedPrizeId) return;
    try {
      await prizeDiamond.moveToNextStateAsync({ prizeId: parsedPrizeId });
      toast.success("Moved to next state successfully");
      fetchPrizeDetails();
    } catch (err) {
      console.error("Error moving to next state:", err);
      toast.error("Failed to move to next state");
    }
  }, [prizeDiamond, parsedPrizeId, fetchPrizeDetails]);

  const canMoveToNextState = useCallback(() => {
    if (!prize) return false;
    // Define your logic to determine if it can move to next state
    return true;
  }, [prize]);

  const getNextStateRequirements = useCallback(() => {
    // Define what is required to move to the next state
    return "All criteria must be met to move to the next state.";
  }, []);

  if (isLoading || !prize) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-indigo-500 text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="manage-page">
      <div className="container">
        <div className="card-base">
          <h1 className="text-3xl font-bold mb-6 text-purple-200">Manage Prize</h1>

          {/* Manage Evaluators Section */}
          <div className="card-base">
            <h2 className="text-2xl font-semibold mb-4 text-purple-100">Manage Evaluators</h2>
            <h3 className="font-semibold text-lg mb-2 text-purple-200">Current Evaluators:</h3>
            <ul className="list-disc list-inside mb-4 text-purple-300">
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
              className="input-field text-gray-900"
              rows={4}
            />
            <button onClick={handleAddEvaluators} className="button-primary mt-4">
              Add Evaluators
            </button>
          </div>

          {/* Current State Section */}
          <div className="card-base">
            <h2 className="text-2xl font-semibold mb-4 text-purple-100">Current State: {State[prize.state]}</h2>
            <p className="mb-4 text-purple-200">{getNextStateRequirements()}</p>
            <button
              onClick={handleMoveToNextState}
              disabled={!canMoveToNextState()}
              className={`button-primary ${!canMoveToNextState() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Move to Next State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagePage;
