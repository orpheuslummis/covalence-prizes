import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { useAppContext } from "../contexts/AppContext";
import { State } from "../lib/types";
import { useQuery } from "@tanstack/react-query";

const SubmitContributionPage: React.FC = () => {
  const { prizeId } = useParams<{ prizeId: string }>();
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { prizeDiamond } = useAppContext();

  const { submitContributionAsync, getPrizeDetails, getState } = prizeDiamond;

  const { data: prizeDetails, isLoading: isLoadingPrizeDetails } = useQuery({
    queryKey: ["prizeDetails", prizeId],
    queryFn: () => getPrizeDetails(BigInt(prizeId as string)),
    enabled: !!prizeId,
  });

  const { data: currentState, isLoading: isLoadingState } = useQuery({
    queryKey: ["prizeState", prizeId],
    queryFn: () => getState(BigInt(prizeId as string)),
    enabled: !!prizeId,
  });

  useEffect(() => {
    if (!isConnected) {
      toast.error("Please connect your wallet to submit a contribution.");
      navigate(`/prize/${prizeId}`);
    }
  }, [isConnected, navigate, prizeId]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      if (description.length > 512) {
        setError("Description cannot be longer than 512 characters");
        return;
      }

      setIsSubmitting(true);
      try {
        const txHash = await submitContributionAsync({
          prizeId: BigInt(prizeId as string),
          description,
        });

        if (typeof txHash === "string" && txHash.startsWith("0x")) {
          await prizeDiamond.waitForTransaction(txHash as `0x${string}`);
        } else {
          throw new Error("Invalid transaction hash returned");
        }

        toast.success("Contribution submitted successfully!");
        navigate(`/prize/${prizeId}`);
      } catch (error) {
        console.error("Error submitting contribution:", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("An unknown error occurred");
        }
        toast.error(`Failed to submit contribution: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [prizeId, description, submitContributionAsync, navigate, prizeDiamond],
  );

  const content = useMemo(() => {
    if (isLoadingPrizeDetails || isLoadingState) return <div className="loading-indicator">Loading...</div>;
    if (!isConnected) return null;

    return (
      <div className="container-default">
        <div className="card">
          <div className="bg-primary-600 px-6 py-4 flex items-center">
            <Link
              to={`/prize/${prizeId}`}
              className="text-white hover:text-neutral-200 transition-colors duration-300 mr-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h2 className="text-2xl-mobile font-bold text-white">Submit Contribution</h2>
          </div>
          <div className="p-6">
            <h3 className="text-xl-mobile font-semibold mb-2 text-white">{prizeDetails?.name}</h3>
            <p className="text-sm-mobile text-neutral-200 mb-6">{prizeDetails?.description}</p>

            <div className="mb-6 bg-primary-700 p-4 rounded-lg">
              <h4 className="text-lg-mobile font-semibold mb-2 text-white">Current Prize State</h4>
              <p className="text-sm-mobile text-neutral-200">
                The prize is currently in the <strong>{State[currentState as number]}</strong> state.
                <br />
                {currentState !== State.Open && (
                  <span className="text-accent-300">
                    {" "}
                    Submissions are only allowed when the prize is in the Open state.
                  </span>
                )}
              </p>
            </div>

            <div className="mb-6 bg-primary-700 p-4 rounded-lg">
              <h4 className="text-lg-mobile font-semibold mb-2 text-white">About Submitting a Contribution</h4>
              <p className="text-sm-mobile text-neutral-200">
                By submitting a contribution, you're proposing a solution or idea for this prize. Your submission will
                be evaluated based on the prize criteria. Make sure your description is clear, concise, and addresses
                the prize objectives.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="description" className="form-label">
                  Contribution Description
                </label>
                <textarea
                  id="description"
                  rows={6}
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  required
                  placeholder="Describe your contribution here..."
                />
                {error && <p className="text-accent-500">{error}</p>}
                <p className="text-xs-mobile text-neutral-400">{description.length}/200 characters</p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || currentState !== State.Open}
                className={`button-primary w-full ${
                  isSubmitting || currentState !== State.Open ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit Contribution"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }, [
    isLoadingPrizeDetails,
    isLoadingState,
    isConnected,
    prizeDetails,
    currentState,
    description,
    error,
    isSubmitting,
    handleSubmit,
    prizeId,
  ]);

  return content;
};

export default SubmitContributionPage;
