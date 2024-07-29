import React from 'react';
import { Contribution } from '../app/types';

interface SubmissionCardProps {
    contribution: Contribution;
}

const SubmissionCard: React.FC<SubmissionCardProps> = ({ contribution }) => {
    return (
        <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Submission #{contribution.id}</h3>
            <p className="text-gray-600 mb-2">{contribution.description}</p>
            <p className="text-sm">Contestant: {contribution.contestant}</p>
        </div>
    );
};

export default SubmissionCard;