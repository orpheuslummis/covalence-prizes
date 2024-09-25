import React from "react";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { Contribution, PrizeDetails } from "../lib/types";

const ContributionPage: React.FC = () => {
  const { prizeId, id } = useParams<{ prizeId: string; id: string }>();
  const prizeDiamond = usePrizeDiamond();

  const {
    data: prizeData,
    isLoading: isPrizeLoading,
    error: prizeError,
  } = useQuery<PrizeDetails>({
    queryKey: ["prizeDetails", prizeId],
    queryFn: () => prizeDiamond.getPrizeDetails(BigInt(prizeId!)),
    enabled: !!prizeId,
  });

  const {
    data: contributionData,
    isLoading: isContributionLoading,
    error: contributionError,
  } = useQuery<Contribution>({
    queryKey: ["contribution", prizeId, id],
    queryFn: () => prizeDiamond.getContribution(BigInt(prizeId!), BigInt(id!)),
    enabled: !!prizeId && !!id,
  });

  const {
    data: evaluationCount,
    isLoading: isEvaluationCountLoading,
    error: evaluationCountError,
  } = useQuery<bigint>({
    queryKey: ["evaluationCount", prizeId, id],
    queryFn: () => prizeDiamond.getEvaluationCount(BigInt(prizeId!), BigInt(id!)),
    enabled: !!prizeId && !!id,
  });

  const isLoading = isPrizeLoading || isContributionLoading || isEvaluationCountLoading;
  const error = prizeError || contributionError || evaluationCountError;

  if (isLoading) {
    return <div className="text-center py-4">Loading contribution details...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-secondary-500">Error: {error.message}</div>;
  }

  if (!contributionData || !prizeData) {
    return <div className="text-center py-4">Contribution or prize not found</div>;
  }

  return (
    <div className="min-h-screen bg-primary-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to={`/prize/${prizeId}`}
          className="inline-flex items-center text-primary-300 hover:text-primary-100 mb-6 transition duration-300"
        >
          <FaArrowLeft className="mr-2" />
          Back to Prize
        </Link>
        <h1 className="text-4xl font-bold mb-8 text-center">Contribution Details</h1>
        <div className="bg-white text-primary-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contribution Information</h2>
          <p className="mb-4 text-lg">
            <strong>Contribution ID:</strong> {contributionData.id.toString()}
          </p>
          <p className="mb-4 text-lg">
            <strong>Contestant:</strong> {contributionData.contestant}
          </p>
          <p className="mb-4 text-lg">
            <strong>Evaluation Count:</strong> {contributionData.evaluationCount.toString()}
          </p>
          <p className="mb-4 text-lg">
            <strong>Description:</strong> {contributionData.description}
          </p>
        </div>
        {evaluationCount !== undefined && evaluationCount > 0 && (
          <div className="bg-white text-primary-900 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Evaluation Information</h2>
            <p className="mb-4 text-lg">
              <strong>Total Evaluations:</strong> {evaluationCount.toString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributionPage;
