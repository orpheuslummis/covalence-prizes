import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { parseEther } from "viem";
import { useBalance, useWaitForTransactionReceipt } from "wagmi";
import { allocationStrategies } from "../config";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { isValidAmount } from "../lib/lib";
import { AllocationStrategy, PrizeParams } from "../lib/types";
import { useWalletContext } from "../contexts/WalletContext";
import { useNavigate } from "react-router-dom";

const CreatePrizePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { account, isLoading: walletLoading } = useWalletContext();
  const { address, isConnected } = account;
  const { createPrizeAsync, getPrizes } = usePrizeDiamond();
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>(undefined);
  const { data: balance } = useBalance({ address });

  const {
    data: transactionReceipt,
    isError,
    isLoading: transactionLoading,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalRewardPool, setTotalRewardPool] = useState("0.0001");
  const [allocationStrategy, setAllocationStrategy] = useState<AllocationStrategy>(AllocationStrategy.Linear);
  const [criteriaNames, setCriteriaNames] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonText, setButtonText] = useState("Create Prize");

  useEffect(() => {
    const initializeComponent = async () => {
      // Perform any necessary async operations here
      setIsLoading(false);
    };
    initializeComponent();
  }, []);

  useEffect(() => {
    if (!walletLoading && !isConnected) {
      toast.error("Please connect your wallet to create a prize.");
    }
  }, [isConnected, walletLoading]);

  useEffect(() => {
    if (isSubmitting) {
      setButtonText("Creating Prize...");
    } else if (!isConnected) {
      setButtonText("Connect Wallet to Create Prize");
    } else {
      setButtonText("Create Prize");
    }
  }, [isConnected, isSubmitting]);

  const handleTransactionSuccess = useCallback(async () => {
    toast.success("Prize created successfully");
    try {
      const prizesResult = await getPrizes(1n, 1n);
      if (prizesResult && prizesResult.length > 0) {
        const createdPrize = prizesResult[0];
        if (createdPrize && createdPrize.id) {
          navigate(`/prize/${createdPrize.id}`);
        } else {
          throw new Error("Failed to retrieve the created prize");
        }
      } else {
        throw new Error("Failed to fetch the created prize");
      }
    } catch (error) {
      console.error("Error after transaction success:", error);
      toast.error("Prize created, but there was an error loading the details.");
      navigate("/prizes");
    }
  }, [getPrizes, navigate]);

  useEffect(() => {
    if (isSuccess && transactionReceipt) {
      handleTransactionSuccess();
    } else if (isError) {
      toast.error("Transaction failed. Please try again.");
    }
  }, [isSuccess, isError, transactionReceipt, handleTransactionSuccess]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected || !address) {
        toast.error("Please connect your wallet to create a prize.");
        return;
      }
      setIsSubmitting(true);

      try {
        if (!name.trim()) throw new Error("Name is required");
        if (!description.trim()) throw new Error("Description is required");
        if (!isValidAmount(totalRewardPool)) throw new Error("Invalid reward pool amount");
        if (parseFloat(totalRewardPool) <= 0) throw new Error("Total reward pool must be greater than 0");
        if (criteriaNames.length === 0) throw new Error("At least one criterion is required");
        if (criteriaNames.some((name) => !name.trim())) throw new Error("All criteria names must be filled");

        const rewardPoolValue = parseEther(totalRewardPool);
        const estimatedGas = parseEther("0.001");

        if (balance && balance.value < rewardPoolValue + estimatedGas) {
          throw new Error("Insufficient funds for reward pool and gas fees");
        }

        const MAX_REWARD_POOL = parseEther("1000"); // 1000 ETH
        if (rewardPoolValue > MAX_REWARD_POOL) {
          throw new Error("Total reward pool exceeds maximum allowed");
        }

        const MAX_CRITERIA = 10;
        if (criteriaNames.length > MAX_CRITERIA) {
          throw new Error(`Maximum of ${MAX_CRITERIA} criteria allowed`);
        }

        const prizeParams: PrizeParams = {
          name: name.trim(),
          description: description.trim(),
          pool: rewardPoolValue,
          criteria: criteriaNames.filter((name) => name.trim()),
          criteriaWeights: Array(criteriaNames.length).fill(1),
          strategy: allocationStrategy,
        };

        const result = await createPrizeAsync(prizeParams);
        console.log("Create Prize Result:", result);

        if (result) {
          setTransactionHash(result as `0x${string}`);
          toast.success("Prize created successfully. Waiting for confirmation...");
        } else {
          throw new Error("Failed to create prize: No transaction hash returned.");
        }
      } catch (error) {
        console.error("Detailed error in handleSubmit:", error);
        toast.error(`Failed to create prize: ${(error as Error).message}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isConnected,
      address,
      name,
      description,
      totalRewardPool,
      criteriaNames,
      allocationStrategy,
      balance,
      createPrizeAsync,
    ]
  );

  const addCriteria = () => {
    setCriteriaNames([...criteriaNames, ""]);
  };

  const removeCriteria = (index: number) => {
    const newCriteria = criteriaNames.filter((_, i) => i !== index);
    setCriteriaNames(newCriteria);
  };

  const updateCriteria = (index: number, value: string) => {
    const newCriteria = [...criteriaNames];
    newCriteria[index] = value;
    setCriteriaNames(newCriteria);
  };

  if (isLoading || walletLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center">
          <span className="text-gray-700">Checking wallet connection...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Wallet Not Connected!</strong>
          <span className="block sm:inline"> Please connect your wallet to create a prize.</span>
        </div>
      </div>
    );
  }

  const isFormValid = name.trim() && description.trim() && isValidAmount(totalRewardPool) && criteriaNames.every(name => name.trim());

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-purple-900 py-12 rounded-lg shadow-xl">
        <div className="max-w-4xl mx-auto bg-white rounded-lg overflow-hidden">
          <div className="bg-purple-800 px-6 py-4">
            <h2 className="text-3xl font-bold text-white">Create a New Prize</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <label htmlFor="name" className="form-label text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input w-full mt-1 text-gray-900"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description" className="form-label text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="form-input w-full mt-1 text-gray-900"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="totalRewardPool" className="form-label text-gray-700">
                  Total Reward Pool (ETH)
                </label>
                <input
                  type="number"
                  id="totalRewardPool"
                  value={totalRewardPool}
                  onChange={(e) => setTotalRewardPool(e.target.value)}
                  className="form-input w-full mt-1 text-gray-900"
                  required
                  step="0.0001"
                  min="0.0001"
                />
              </div>
              <div className="form-group">
                <label htmlFor="allocationStrategy" className="form-label text-gray-700">
                  Allocation Strategy
                </label>
                <select
                  id="allocationStrategy"
                  value={allocationStrategy}
                  onChange={(e) => setAllocationStrategy(Number(e.target.value) as AllocationStrategy)}
                  className="form-input w-full mt-1 text-gray-900"
                  required
                >
                  {allocationStrategies.map((strategy) => (
                    <option key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label text-gray-700">Evaluation Criteria</label>
                <div className="mt-2 space-y-2">
                  {criteriaNames.map((criteria, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={criteria}
                        onChange={(e) => updateCriteria(index, e.target.value)}
                        className="form-input flex-grow text-gray-900"
                        placeholder={`Criteria ${index + 1}`}
                        required
                      />
                      {criteriaNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCriteria(index)}
                          className="button-danger px-2 py-1 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addCriteria} className="button-secondary mt-2 px-4 py-2 text-sm">
                  Add Criteria
                </button>
              </div>
              <div className="form-group">
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className={`button-primary w-full py-3 ${isSubmitting || !isFormValid ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {buttonText}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePrizePage;
