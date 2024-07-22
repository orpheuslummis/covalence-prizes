import React from 'react';
import { useError } from '../ErrorContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { useRoleBasedAccess } from '../hooks/useRoleBasedAccess';
import { PrizeStatus } from '../types';

interface PrizeStateProps {
    prizeId: number;
    currentState: PrizeStatus;
    onStateChange: (newState: PrizeStatus | null) => void;
}

const PrizeState: React.FC<PrizeStateProps> = ({ prizeId, currentState, onStateChange }) => {
    const { moveToNextState } = usePrizeManager();
    const { canMoveToNextState } = useRoleBasedAccess();
    const { handleError } = useError();

    const handleMoveToNextState = async () => {
        try {
            const newState = await moveToNextState(prizeId);
            if (newState !== null) {
                onStateChange(newState);
            } else {
                // Handle the case where moveToNextState returns null
                console.warn('Failed to move to next state: Returned null');
            }
        } catch (error) {
            handleError('Failed to move to next state', error);
        }
    };

    const getNextState = (currentState: PrizeStatus): PrizeStatus | null => {
        switch (currentState) {
            case PrizeStatus.Setup: return PrizeStatus.Open;
            case PrizeStatus.Open: return PrizeStatus.Evaluating;
            case PrizeStatus.Evaluating: return PrizeStatus.Rewarding;
            case PrizeStatus.Rewarding: return PrizeStatus.Closed;
            default: return null;
        }
    };

    const nextState = getNextState(currentState);

    return (
        <div className="flex items-center space-x-4">
            <span className="font-semibold text-lg">{currentState}</span>
            {canMoveToNextState && nextState && currentState !== PrizeStatus.Closed && (
                <button
                    onClick={handleMoveToNextState}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    aria-label={`Move prize to ${nextState} state`}
                >
                    Move to {nextState}
                </button>
            )}
        </div>
    );
};

export default PrizeState;