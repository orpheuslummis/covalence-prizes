import React from "react";
import { motion } from "framer-motion";

interface EvaluationCriteriaProps {
  criteria: string[];
  scores: number[];
  onScoreChange: (index: number, value: number) => void;
  isSubmitting: boolean;
}

const EvaluationCriteria: React.FC<EvaluationCriteriaProps> = ({ criteria, scores, onScoreChange, isSubmitting }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Evaluation Criteria</h2>
      {criteria.map((criterion, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-primary-800 bg-opacity-20 p-6 rounded-lg shadow-md"
        >
          <h3 className="text-xl font-medium mb-3">{criterion}</h3>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={scores[index]}
              onChange={(e) => onScoreChange(index, parseInt(e.target.value))}
              disabled={isSubmitting}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-2xl font-bold">{scores[index]}</span>
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default EvaluationCriteria;
