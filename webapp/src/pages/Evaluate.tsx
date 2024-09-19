import React, { useCallback, useEffect, useMemo, useReducer } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FaInfoCircle, FaSpinner } from "react-icons/fa";
import { useAccount } from "wagmi";
import { Contribution, PrizeDetails } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { Address } from "viem";

interface EvaluatePageState {
  prize: PrizeDetails | null;
  contributions: Contribution[];
  selectedContribution: Contribution | null;
  scores: number[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  canEvaluate: boolean;
  hoveredCriterion: number | null;
}

type Action =
  | { type: "SET_PRIZE"; payload: PrizeDetails }
  | { type: "SET_CONTRIBUTIONS"; payload: Contribution[] }
  | { type: "SET_SELECTED_CONTRIBUTION"; payload: Contribution | null }
  | { type: "SET_SCORES"; payload: number[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CAN_EVALUATE"; payload: boolean }
  | { type: "SET_HOVERED_CRITERION"; payload: number | null };

const initialState: EvaluatePageState = {
  prize: null,
  contributions: [],
  selectedContribution: null,
  scores: [],
  isLoading: true,
  isSubmitting: false,
  error: null,
  canEvaluate: false,
  hoveredCriterion: null,
};

function reducer(state: EvaluatePageState, action: Action): EvaluatePageState {
  switch (action.type) {
    case "SET_PRIZE":
      return { ...state, prize: action.payload };
    case "SET_CONTRIBUTIONS":
      return { ...state, contributions: action.payload };
    case "SET_SELECTED_CONTRIBUTION":
      return { ...state, selectedContribution: action.payload };
    case "SET_SCORES":
      return { ...state, scores: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_CAN_EVALUATE":
      return { ...state, canEvaluate: action.payload };
    case "SET_HOVERED_CRITERION":
      return { ...state, hoveredCriterion: action.payload };
    default:
      return state;
  }
}

const EvaluatePage: React.FC = () => {
  const { prizeId } = useParams<{ prizeId: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { prizeDiamond } = useAppContext();
  const [state, dispatch] = useReducer(reducer, initialState);

  const { evaluate, encryptScores } = usePrizeDiamond();

  const fetchPrizeDetails = useCallback(async () => {
    if (!prizeId) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const prizeDetails = await prizeDiamond.getPrizeDetails(BigInt(prizeId));
      dispatch({ type: "SET_PRIZE", payload: prizeDetails });

      const contributionCount = await prizeDiamond.getContributionCount(BigInt(prizeId));
      const contributions = await Promise.all(
        Array.from({ length: Number(contributionCount) }, (_, i) =>
          prizeDiamond.getContribution(BigInt(prizeId), BigInt(i)),
        ),
      );
      dispatch({ type: "SET_CONTRIBUTIONS", payload: contributions });

      const canEvaluate = await prizeDiamond.canEvaluate(BigInt(prizeId), address as Address);
      dispatch({ type: "SET_CAN_EVALUATE", payload: canEvaluate });

      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      console.error("Error fetching prize details:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch prize details" });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [prizeId, prizeDiamond, address]);

  useEffect(() => {
    fetchPrizeDetails();
  }, [fetchPrizeDetails]);

  const handleContributionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = event.target.value;
      const selected = state.contributions.find((c) => c.id.toString() === selectedId) || null;
      dispatch({ type: "SET_SELECTED_CONTRIBUTION", payload: selected });
      dispatch({ type: "SET_SCORES", payload: new Array(state.prize?.criteriaNames.length || 0).fill(5) });
    },
    [state.contributions, state.prize],
  );

  const handleScoreChange = useCallback(
    (index: number, value: number) => {
      const newScores = [...state.scores];
      newScores[index] = value;
      dispatch({ type: "SET_SCORES", payload: newScores });
    },
    [state.scores],
  );

  const isFormValid = useMemo(() => {
    if (!state.prize) return false;
    return (
      state.scores.length === state.prize.criteriaNames.length &&
      state.scores.every((score) => score >= 1 && score <= 10) &&
      !!state.selectedContribution
    );
  }, [state.prize, state.scores, state.selectedContribution]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid || !state.prize || !state.selectedContribution) return;

    try {
      dispatch({ type: "SET_SUBMITTING", payload: true });
      const encryptedScores = await encryptScores(state.scores);
      await evaluate({
        prizeId: BigInt(prizeId as string),
        contributionId: state.selectedContribution.id,
        encryptedScores: encryptedScores
      });
      toast.success("Evaluation submitted successfully!");
      navigate(`/prize/${prizeId}`);
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      toast.error("Failed to submit evaluation. Please try again.");
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <FaSpinner className="animate-spin text-purple-600 text-3xl" />
      </div>
    );
  }

  if (state.error) {
    return <div className="text-red-500">{state.error}</div>;
  }

  return (
    <div className="prize-container max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Evaluate Contribution for Prize: {state.prize?.name}</h1>
      {state.isLoading ? (
        <div className="flex justify-center items-center h-full">
          <FaSpinner className="animate-spin text-purple-600 text-3xl" />
        </div>
      ) : state.error ? (
        <div className="text-red-500">{state.error}</div>
      ) : state.canEvaluate ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="contribution" className="form-label">
              Select Contribution:
            </label>
            <select
              id="contribution"
              value={state.selectedContribution?.id.toString() || ""}
              onChange={handleContributionChange}
              className="form-input"
              required
              disabled={state.isSubmitting}
            >
              <option value="">Select a contribution</option>
              {state.contributions.map((contribution) => (
                <option key={contribution.id.toString()} value={contribution.id.toString()}>
                  Contribution {contribution.id.toString()} by {contribution.contestant}
                </option>
              ))}
            </select>
          </div>

          {state.selectedContribution && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Contribution Details</h2>
              <p className="mb-2">
                <strong>Contestant:</strong> {state.selectedContribution.contestant}
              </p>
              <p className="mb-4">
                <strong>Description:</strong> {state.selectedContribution.description}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-2">Evaluation Criteria</h2>
            {state.prize?.criteriaNames.map((criterion, index) => (
              <div key={index} className="mb-4">
                <label htmlFor={`criterion-${index}`} className="form-label flex items-center">
                  {criterion}
                  <div
                    className="ml-2 relative"
                    onMouseEnter={() => dispatch({ type: "SET_HOVERED_CRITERION", payload: index })}
                    onMouseLeave={() => dispatch({ type: "SET_HOVERED_CRITERION", payload: null })}
                  >
                    <FaInfoCircle className="text-purple-500" />
                    {state.hoveredCriterion === index && (
                      <div className="absolute left-6 top-0 bg-white border border-purple-300 p-2 rounded shadow-md z-10 w-64">
                        <p className="text-sm text-gray-600">Rate this criterion from 1 (lowest) to 10 (highest).</p>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="range"
                  id={`criterion-${index}`}
                  min="1"
                  max="10"
                  value={state.scores[index] || 5}
                  onChange={(e) => handleScoreChange(index, parseInt(e.target.value))}
                  className="w-full"
                  required
                  disabled={state.isSubmitting}
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                </div>
                <p className="text-center mt-1">Current score: {state.scores[index] || 5}</p>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className={`w-full py-2 px-4 rounded ${
              isFormValid && !state.isSubmitting
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!isFormValid || state.isSubmitting}
          >
            {state.isSubmitting ? "Submitting..." : "Submit Evaluation"}
          </button>
        </form>
      ) : (
        <div className="text-red-500">You do not have permission to evaluate this prize.</div>
      )}
    </div>
  );
};

export default EvaluatePage;
