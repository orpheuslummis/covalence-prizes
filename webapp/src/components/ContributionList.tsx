import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "../contexts/AppContext";
import { Contribution } from "../lib/types";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";

interface ContributionListProps {
  prizeId: bigint;
}

const ContributionList: React.FC<ContributionListProps> = ({ prizeId }) => {
  const { prizeDiamond } = useAppContext();
  const { address } = useAccount();

  const { data: contributionCount, isLoading: isCountLoading, error: countError } = useQuery({
    queryKey: ["contributionCount", prizeId.toString()],
    queryFn: async () => {
      console.log(`Fetching contribution count for prize ${prizeId}`);
      const count = await prizeDiamond.getContributionCount(prizeId);
      console.log(`Contribution count for prize ${prizeId}: ${count}`);
      return count;
    },
  });

  const { data: contributions, isLoading: isContributionsLoading, error: contributionsError } = useQuery<Contribution[]>({
    queryKey: ["contributions", prizeId.toString(), contributionCount?.toString()],
    queryFn: async () => {
      if (contributionCount === undefined || contributionCount === 0n) {
        console.log(`No contributions for prize ${prizeId}`);
        return [];
      }
      console.log(`Fetching ${contributionCount} contributions for prize ${prizeId}`);
      const contribs = await Promise.all(
        Array.from({ length: Number(contributionCount) }, (_, i) =>
          prizeDiamond.getContribution(prizeId, BigInt(i))
        )
      );
      console.log(`Fetched contributions for prize ${prizeId}:`, contribs);
      return contribs;
    },
    enabled: contributionCount !== undefined && contributionCount > 0n,
  });

  if (isCountLoading || isContributionsLoading) {
    return <div className="text-center py-4">Loading contributions...</div>;
  }

  if (countError || contributionsError) {
    console.error("Error fetching contribution count:", countError);
    console.error("Error fetching contributions:", contributionsError);
    return <div className="text-center py-4 text-red-500">Error loading contributions. Please try again.</div>;
  }

  if (!contributions || contributions.length === 0) {
    console.log(`No contributions available for prize ${prizeId}`);
    return <div className="text-center py-4">No contributions available for this prize.</div>;
  }

  console.log(`Rendering ${contributions.length} contributions for prize ${prizeId}`);

  return (
    <div className="mt-8">
      <div className="space-y-4">
        {contributions.map((contribution, index) => {
          const isOwnContribution = contribution.contestant.toLowerCase() === address?.toLowerCase();
          return (
            <Link
              key={index}
              to={`/prize/${prizeId}/contribution/${contribution.id}`}
              className={`block hover:shadow-lg transition-shadow duration-300 ${
                isOwnContribution ? 'border-2 border-purple-500' : ''
              }`}
            >
              <div className={`bg-white rounded-lg shadow-md p-6 ${
                isOwnContribution ? 'bg-purple-50' : ''
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">
                    Contribution #{index + 1}
                    {isOwnContribution && (
                      <span className="ml-2 text-sm font-normal text-purple-600">(Your contribution)</span>
                    )}
                  </h3>
                  <span className="text-sm text-gray-500">
                    Evaluations: {contribution.evaluationCount.toString()}
                  </span>
                </div>
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">Contributor:</span> {contribution.contestant}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Description:</span> {contribution.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ContributionList;
