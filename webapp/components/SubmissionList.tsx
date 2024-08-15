import React, { useState } from 'react';
import { Submission } from '../types';

interface SubmissionListProps {
    submissions: Submission[];
    onScoreSubmit: (scores: { [id: number]: number }, comments: { [id: number]: string }) => Promise<void>;
}

const SubmissionList: React.FC<SubmissionListProps> = ({ submissions, onScoreSubmit }) => {
    const [scores, setScores] = useState<{ [id: number]: number }>({});
    const [comments, setComments] = useState<{ [id: number]: string }>({});

    const handleScoreChange = (id: number, score: number) => {
        setScores(prev => ({ ...prev, [id]: score }));
    };

    const handleCommentChange = (id: number, comment: string) => {
        setComments(prev => ({ ...prev, [id]: comment }));
    };

    const handleSubmit = async () => {
        await onScoreSubmit(scores, comments);
        setScores({});
        setComments({});
    };

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Submission ID</th>
                        <th>Description</th>
                        <th>New Score</th>
                        <th>Comments</th>
                    </tr>
                </thead>
                <tbody>
                    {submissions.map(submission => (
                        <tr key={submission.id}>
                            <td>{submission.id}</td>
                            <td>{submission.description}</td>
                            <td>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={scores[Number(submission.id)] || ''}
                                    onChange={(e) => handleScoreChange(Number(submission.id), Number(e.target.value))}
                                />
                            </td>
                            <td>
                                <textarea
                                    value={comments[Number(submission.id)] || ''}
                                    onChange={(e) => handleCommentChange(Number(submission.id), e.target.value)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={handleSubmit}>Submit All Scores</button>
        </div>
    );
};

export default SubmissionList;