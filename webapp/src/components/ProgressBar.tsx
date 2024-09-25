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
    <div className="bg-primary-800 p-6 rounded-lg shadow-lg mb-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {states.map((item, index) => (
          <div key={item.state} className="flex flex-col items-center relative">
            {/* Circle and Connector */}
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-300 ${
                  item.active
                    ? "bg-secondary-400 text-white"
                    : item.completed
                      ? "bg-accent-500 text-white"
                      : "bg-primary-600 text-primary-300"
                }`}
              >
                {item.completed ? <CheckIcon /> : <span className="text-lg font-bold">{index + 1}</span>}
              </div>
              {index < states.length - 1 && (
                <div className={`w-16 h-1 ${item.completed ? "bg-accent-500" : "bg-primary-600"}`}></div>
              )}
            </div>
            {/* Label */}
            <span
              className={`mt-3 text-sm font-medium ${
                item.active ? "text-secondary-300" : item.completed ? "text-accent-400" : "text-primary-300"
              }`}
            >
              {State[item.state]}
            </span>
          </div>
        ))}
      </div>
      {/* State Management Actions */}
      <div className="bg-primary-700 p-6 rounded-md">
        <h3 className="text-2xl font-semibold mb-3 text-white">Current State: {State[currentState.state]}</h3>
        <p className="mb-4 text-primary-100">{currentState.requirements}</p>
        <button
          onClick={currentState.handleMoveToNextState}
          disabled={!currentState.canMoveToNext}
          className={`w-full bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg`}
        >
          Move to Next State
        </button>
      </div>
    </div>
  );
};

export default ProgressBar;
