// src/components/ProgressBar.tsx
import React from "react";
import { State } from "../lib/types";
import CheckIcon from "../components/CheckIcon";

interface ProgressBarProps {
  states: Array<{
    state: State;
    active: boolean;
    completed: boolean;
  }>;
  currentState: {
    state: State;
    requirements: string;
    canMoveToNext: boolean;
    handleMoveToNextState: () => void;
  };
}

const ProgressBar: React.FC<ProgressBarProps> = ({ states, currentState }) => {
  return (
    <div className="bg-purple-800 p-6 rounded-lg shadow-lg mb-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {states.map((item, index) => (
          <div key={item.state} className="flex flex-col items-center relative">
            {/* Circle and Connector */}
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300 ${
                  item.active
                    ? "bg-purple-300 text-purple-900"
                    : item.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-400 text-gray-200"
                }`}
              >
                {item.completed ? <CheckIcon className="w-5 h-5" /> : <span>{index + 1}</span>}
              </div>
              {index < states.length - 1 && (
                <div className={`flex-1 h-1 ${item.completed ? "bg-green-500" : "bg-gray-400"}`}></div>
              )}
            </div>
            {/* Label */}
            <span
              className={`mt-2 text-sm font-medium ${
                item.active ? "text-purple-300" : item.completed ? "text-green-500" : "text-gray-400"
              }`}
            >
              {State[item.state]}
            </span>
          </div>
        ))}
      </div>

      {/* State Management Actions */}
      <div className="bg-purple-700 p-4 rounded-md">
        <h3 className="text-xl font-semibold mb-2">Current State: {State[currentState.state]}</h3>
        <p className="mb-4">{currentState.requirements}</p>
        <button
          onClick={currentState.handleMoveToNextState}
          disabled={!currentState.canMoveToNext}
          className={`w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-opacity duration-200 ${
            !currentState.canMoveToNext ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Move to Next State
        </button>
      </div>
    </div>
  );
};

export default ProgressBar;
