import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";
import { useAccount } from "wagmi";
import { PrizeDetails, Contribution } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import ContributionSelect from "../components/ContributionSelect";
import ContributionDetails from "../components/ContributionDetails";
import EvaluationCriteria from "../components/EvaluationCriteria";
import { motion } from "framer-motion";

const AlreadyEvaluatedBanner: React.FC = () => (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
    <p className="font-bold">Note:</p>
    <p>This contribution has already been evaluated. You cannot submit another evaluation for it.</p>
  </div>
);

const EvaluatePage: React.FC = () => {
  const { prizeId } = useParams<{ prizeId: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { prizeDiamond } = useAppContext();
  const { getEvaluatedContributions } = usePrizeDiamond();

  const [prize, setPrize] = useState<PrizeDetails | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [canEvaluate, setCanEvaluate] = useState<boolean>(false);
  const [evaluatedContributions, setEvaluatedContributions] = useState<bigint[]>([]);

  const fetchPrizeDetails = useCallback(async () => {
    if (!prizeId) return;
    try {
      setIsLoading(true);
      const prizeDetails = await prizeDiamond.getPrizeDetails(BigInt(prizeId));
      console.log("Fetching prize details for ID:", prizeId);
      console.log("Prize details fetched:", prizeDetails);
      console.log("Evaluated Contributions Count:", prizeDetails.evaluatedContributionsCount);
      console.log("Total Contributions Count:", prizeDetails.contributionCount);

      setPrize(prizeDetails);

      const contributionCount = await prizeDiamond.getContributionCount(BigInt(prizeId));
      const fetchedContributions = await Promise.all(
        Array.from({ length: Number(contributionCount) }, (_, i) =>
          prizeDiamond.getContribution(BigInt(prizeId), BigInt(i)),
        ),
      );
      setContributions(fetchedContributions);

      const canEval = await prizeDiamond.canEvaluate(BigInt(prizeId));
      setCanEvaluate(canEval);
    } catch (err) {
      console.error("Error fetching prize details:", err);
      setError("Failed to fetch prize details");
    } finally {
      setIsLoading(false);
    }
  }, [prizeId, prizeDiamond]);

  const fetchEvaluatedContributions = useCallback(async () => {
    if (!prizeId || !address) return;
    try {
      const evaluatedIds = await getEvaluatedContributions(BigInt(prizeId), address);
      setEvaluatedContributions(evaluatedIds);
    } catch (err) {
      console.error("Error fetching evaluated contributions:", err);
    }
  }, [prizeId, getEvaluatedContributions, address]);

  useEffect(() => {
    fetchPrizeDetails();
    fetchEvaluatedContributions();
  }, [fetchPrizeDetails, fetchEvaluatedContributions]);

  const handleContributionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = event.target.value;
      const selected = contributions.find((c) => c.id.toString() === selectedId) || null;
      setSelectedContribution(selected);
      setScores(new Array(prize?.criteriaNames.length || 0).fill(5));
    },
    [contributions, prize],
  );

  const handleScoreChange = useCallback(
    (index: number, value: number) => {
      const newScores = [...scores];
      newScores[index] = value;
      setScores(newScores);
    },
    [scores],
  );

  const isFormValid = useCallback(() => {
    if (!prize || !selectedContribution) return false;
    return (
      scores.length === prize.criteriaNames.length &&
      scores.every((score) => score >= 1 && score <= 10) &&
      !evaluatedContributions.includes(selectedContribution.id)
    );
  }, [prize, scores, selectedContribution, evaluatedContributions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid() || !prize || !selectedContribution) return;
    console.log("Submitting evaluation:", {
      prizeId,
      contributionId: selectedContribution.id,
      scores,
      canEvaluate,
    });
    await confirmSubmit();
  };

  const confirmSubmit = async () => {
    if (!isFormValid() || !prize || !selectedContribution) return;
    try {
      setIsSubmitting(true);
      const canStillEvaluate = await prizeDiamond.canEvaluate(BigInt(prizeId as string));
      if (!canStillEvaluate) {
        throw new Error("Evaluation is no longer allowed for this prize");
      }
      const encrypted = await prizeDiamond.encryptScores(scores);
      await prizeDiamond.evaluateContributionAsync({
        prizeId: BigInt(prizeId as string),
        contributionId: selectedContribution.id,
        encryptedScores: encrypted,
      });
      await fetchEvaluatedContributions();
      navigate(`/prize/${prizeId}`);
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      toast.error(`Failed to submit evaluation: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin text-purple-600 text-4xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="feedback-error">{error}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="prize-container max-w-4xl mx-auto p-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white min-h-screen rounded-lg shadow-lg"
    >
      <h1 className="section-title text-4xl font-bold mb-8">Evaluate Contribution for Prize: {prize?.name}</h1>
      {canEvaluate ? (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">Progress</h2>
            <div className="bg-white rounded-full h-4">
              <div
                className="bg-green-400 h-4 rounded-full transition-all duration-500 ease-in-out"
                style={{
                  width: `${(evaluatedContributions.length / contributions.length) * 100}%`,
                }}
              ></div>
            </div>
            <p className="text-sm mt-2">
              {evaluatedContributions.length} out of {contributions.length} contributions evaluated
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-md">
              <ContributionSelect
                contributions={contributions}
                selectedContributionId={selectedContribution?.id.toString() || ""}
                onChange={handleContributionChange}
                isSubmitting={isSubmitting}
                evaluatedContributions={evaluatedContributions}
              />
            </div>

            {selectedContribution && (
              <>
                {evaluatedContributions.includes(selectedContribution.id) && <AlreadyEvaluatedBanner />}
                <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-md">
                  <ContributionDetails contribution={selectedContribution} />
                </div>

                <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-md">
                  <EvaluationCriteria
                    criteria={prize?.criteriaNames || []}
                    scores={scores}
                    onScoreChange={handleScoreChange}
                    isSubmitting={isSubmitting}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className={`button-primary w-full ${
                    isFormValid() && !isSubmitting && !evaluatedContributions.includes(selectedContribution.id)
                      ? "hover:bg-purple-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!isFormValid() || isSubmitting || evaluatedContributions.includes(selectedContribution.id)}
                >
                  {isSubmitting ? "Submitting..." : "Submit Evaluation"}
                </motion.button>
              </>
            )}
          </form>
        </>
      ) : (
        <div className="text-center text-red-300 text-xl">You do not have permission to evaluate this prize.</div>
      )}
    </motion.div>
  );
};

export default EvaluatePage;
