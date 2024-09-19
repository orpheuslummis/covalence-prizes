import React, { useCallback, useEffect, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther, parseEther } from "viem";
import { toast } from "react-hot-toast";
import { AllocationStrategy, PrizeParams } from "../lib/types";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";

interface TestPrize {
  name: string;
  description: string;
  monetaryRewardPool: bigint;
  criteria: string[];
  criteriaWeights: number[];
  allocationStrategy: AllocationStrategy;
}

const TestingPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold text-white mb-8">Testing Page</h1>
      <div className="bg-purple-100 p-6 rounded-lg shadow-lg">
        <TestPrizeCreation />
      </div>
    </div>
  );
};

const TestPrizeCreation: React.FC = () => {
  const generateRandomPrize = useCallback((): TestPrize => {
    const strategies = [AllocationStrategy.Linear, AllocationStrategy.Quadratic];
    const criteriaOptions = [
      "Innovation",
      "Feasibility",
      "Impact",
      "Scalability",
      "Sustainability",
      "Cost-effectiveness",
      "Originality",
      "User Experience",
      "Technical Complexity",
      "Market Potential",
      "Social Responsibility",
      "Environmental Impact",
    ];
    const adjectives = ["Groundbreaking", "Revolutionary", "Innovative", "Futuristic", "Disruptive"];
    const domains = ["AI", "Blockchain", "IoT", "Quantum Computing", "Biotech", "Clean Energy", "Space Tech"];

    const criteria = Array.from(
      new Set(
        Array(Math.floor(Math.random() * 3) + 2)
          .fill(null)
          .map(() => criteriaOptions[Math.floor(Math.random() * criteriaOptions.length)]),
      ),
    );

    return {
      name: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${domains[Math.floor(Math.random() * domains.length)]} Solution ${Math.floor(Math.random() * 10000)}`,
      description: `Pioneering ${domains[Math.floor(Math.random() * domains.length)]} project aiming to revolutionize ${criteriaOptions[Math.floor(Math.random() * criteriaOptions.length)].toLowerCase()} in the ${new Date().getFullYear() + Math.floor(Math.random() * 10)} landscape.`,
      monetaryRewardPool: parseEther("0.00001"),
      criteria: criteria,
      criteriaWeights: Array(criteria.length).fill(1),
      allocationStrategy: strategies[Math.floor(Math.random() * strategies.length)],
    };
  }, []);

  const { createPrize } = usePrizeDiamond();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  const [testPrize, setTestPrize] = useState<TestPrize | null>(null);
  const [loading, setLoading] = useState(false); // New loading state

  useEffect(() => {
    setTestPrize(generateRandomPrize());
  }, [generateRandomPrize]);

  useEffect(() => {
    if (!isConnected) {
      toast("Please connect your wallet to create prizes.", {
        duration: 5000,
        position: "top-center",
      });
    }
  }, [isConnected]);

  const handleCreatePrize = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet before creating a prize.");
      return;
    }

    if (!testPrize) {
      toast.error("No test prize data available.");
      return;
    }

    const rewardPoolValue = testPrize.monetaryRewardPool;
    const estimatedGas = parseEther("0.001"); // Consider using actual gas estimation

    if (balance && balance.value < rewardPoolValue + estimatedGas) {
      toast.error(
        "Insufficient funds. Please ensure you have enough ETH for the reward pool and gas fees."
      );
      return;
    }

    setLoading(true); // Start loading

    try {
      const prizeParams: PrizeParams = {
        name: testPrize.name,
        description: testPrize.description,
        pool: testPrize.monetaryRewardPool,
        criteria: testPrize.criteria,
        criteriaWeights: testPrize.criteriaWeights,
        strategy: testPrize.allocationStrategy,
      };

      const tx = await createPrize(prizeParams);
      toast.promise(tx.wait(), {
        loading: "Creating prize...",
        success: "Prize created successfully!",
        error: (err) => `Failed to create prize: ${err.message}`,
      });

      await tx.wait(); // Wait for transaction confirmation
      setTestPrize(generateRandomPrize());
    } catch (error: any) {
      console.error("Error creating prize:", error);
      toast.error(`Failed to create prize: ${error.message || error.toString()}`);
    } finally {
      setLoading(false); // End loading
    }
  };

  const handleGenerateNewPrize = () => {
    setTestPrize(generateRandomPrize());
  };

  const getStrategyName = (strategy: AllocationStrategy) => {
    return AllocationStrategy[strategy] || "Unknown";
  };

  if (!testPrize) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mb-8 bg-white shadow-lg rounded-lg overflow-hidden">
      <h2 className="text-3xl font-bold p-6 bg-purple-600 text-white">Test Prize Creation</h2>
      <div className="p-8">
        <div className="mb-6 bg-purple-100 p-6 rounded-lg shadow">
          <h3 className="text-2xl font-semibold mb-3 text-purple-800">{testPrize.name}</h3>
          <p className="text-purple-700 text-lg">{testPrize.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h2 className="font-semibold text-blue-800 mb-2 text-xl">Amount</h2>
            <div className="prize-amount-value">
              <p className="text-blue-700 text-2xl font-bold">{formatEther(testPrize.monetaryRewardPool)} ETH</p>
            </div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h2 className="font-semibold text-green-800 mb-2 text-xl">Allocation Strategy</h2>
            <p className="text-green-700 text-2xl font-bold">{getStrategyName(testPrize.allocationStrategy)}</p>
          </div>
        </div>
        <div className="mb-6 bg-yellow-100 p-6 rounded-lg">
          <h2 className="font-semibold text-yellow-800 mb-3 text-xl">Evaluation Criteria</h2>
          <ul className="list-disc list-inside text-yellow-700 text-lg">
            {testPrize.criteria.map((criterion, index) => (
              <li key={index} className="mb-2">
                {criterion}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex space-x-4 mb-6">
          <button
            onClick={handleGenerateNewPrize}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300"
          >
            Generate New Prize
          </button>
          <button
            onClick={handleCreatePrize}
            className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!isConnected || !address || loading}
          >
            {loading ? "Creating Prize..." : "Create Prize"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestingPage;
