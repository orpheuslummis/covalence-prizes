import React from "react";
import { State } from "../lib/types";

interface ProgressBarProps {
  states: Array<{
    state: State;
    active: boolean;
    completed: boolean;
  }>;
}

const CheckIcon: React.FC<{ className: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
};

const ProgressBar: React.FC<ProgressBarProps> = ({ states }) => {
  return (
    <div className="flex justify-between mb-8">
      {states.map(({ state, active, completed }) => (
        <div key={state} className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
              active
                ? "bg-purple-300 text-purple-900"
                : completed
                  ? "bg-green-500 text-white"
                  : "bg-gray-400 text-gray-200"
            }`}
          >
            {completed && <CheckIcon className="w-5 h-5" />}
          </div>
          <span className={`text-sm ${active ? "text-purple-300" : completed ? "text-green-500" : "text-gray-400"}`}>
            {State[state]}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ProgressBar;
