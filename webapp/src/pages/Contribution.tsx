import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { formatEther } from "viem";
import { Contribution, PrizeDetails, State } from "../lib/types";
import { useAppContext } from "../contexts/AppContext";

const ContributionPage: React.FC = () => {
  const { prizeId, id } = useParams();
  const { prizeDiamond, isLoading } = useAppContext();
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [prize, setPrize] = useState<PrizeDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!prizeId || !id) {
        setError("Invalid prize or contribution ID");
        return;
      }

      try {
        const [contributionData, prizeData] = await Promise.all([
          prizeDiamond.getContribution(BigInt(prizeId), BigInt(id)),
          prizeDiamond.getPrizeDetails(BigInt(prizeId)),
        ]);
        setContribution(contributionData);
        setPrize(prizeData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch contribution and prize details");
      }
    };

    fetchData();
  }, [prizeId, id, prizeDiamond]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-white text-xl">Loading contribution data...</div>
    );
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500 text-xl">{error}</div>;
  }

  if (!contribution || !prize) {
    return (
      <div className="flex justify-center items-center h-screen text-white text-xl">
        Contribution or prize not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to={`/prize/${prizeId}`}
          className="inline-flex items-center text-blue-300 hover:text-blue-100 mb-6 transition duration-300"
        >
          <FaArrowLeft className="mr-2" />
          Back to Prize
        </Link>
        <h1 className="text-4xl font-bold mb-8 text-center">Contribution Details</h1>
        <div className="bg-white text-purple-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contribution Information</h2>
          <p className="mb-4 text-lg">
            <strong>Contribution ID:</strong> {contribution.id.toString()}
          </p>
          <p className="mb-4 text-lg">
            <strong>Contestant:</strong> {contribution.contestant}
          </p>
          <p className="mb-4 text-lg">
            <strong>Evaluation Count:</strong> {contribution.evaluationCount.toString()}
          </p>
          <p className="mb-4 text-lg">
            <strong>Description:</strong> {contribution.description}
          </p>
          <p className="mb-4 text-lg">
            <strong>Claimed:</strong> {contribution.claimed ? "Yes" : "No"}
          </p>
          <h3 className="text-xl font-semibold mb-2">Evaluation Scores</h3>
          <ul className="list-disc pl-5">
            {prize.criteriaNames.map((criterion: string, index: number) => (
              <li key={index} className="mb-2">
                <strong>{criterion}:</strong> {contribution.evaluationScores[index].toString()}
              </li>
            ))}
          </ul>
          <div className="bg-purple-100 p-4 rounded-md">
            <h3 className="text-xl font-semibold mb-2">Prize Information</h3>
            <p>
              <strong>Name:</strong> {prize.name}
            </p>
            <p>
              <strong>Total Reward:</strong> {formatEther(prize.monetaryRewardPool)} ETH
            </p>
            <p>
              <strong>State:</strong> {State[prize.state]}
            </p>
            <p>
              <strong>Allocation Strategy:</strong> {prize.strategy}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributionPage;
