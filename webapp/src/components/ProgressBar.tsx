// src/components/ProgressBar.tsx
import React from "react";
import { State } from "../lib/types";
import CheckIcon from "./CheckIcon";

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
    <div className="bg-primary-800 p-4 sm:p-6 rounded-lg shadow-lg mb-8">
      {/* Progress Steps */}
      <div className="progress-bar">
        {states.map((item, index) => (
          <React.Fragment key={item.state}>
            <div className="progress-step">
              <div
                className={`progress-circle ${
                  item.completed
                    ? "progress-circle-completed"
                    : item.active
                    ? "progress-circle-active"
                    : "progress-circle-inactive"
                }`}
              >
                {item.completed ? (
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-8 md:h-8" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`progress-label ${
                  item.completed
                    ? "progress-label-completed"
                    : item.active
                    ? "progress-label-active"
                    : "progress-label-inactive"
                }`}
              >
                {State[item.state]}
              </span>
            </div>
            {index < states.length - 1 && (
              <div
                className={`progress-connector ${
                  item.completed ? "progress-connector-completed" : ""
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current State Management */}
      <div className="current-state-card mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <h3 className="current-state-badge mb-2 sm:mb-0">
            Current: <span className="font-bold">{State[currentState.state]}</span>
          </h3>
          <button
            onClick={currentState.handleMoveToNextState}
            disabled={!currentState.canMoveToNext}
            className={`current-state-button ${
              !currentState.canMoveToNext ? "current-state-button-disabled" : ""
            }`}
          >
            Next State
          </button>
        </div>
        <p className="current-state-content">{currentState.requirements}</p>
      </div>
    </div>
  );
};

export default ProgressBar;
