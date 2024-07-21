import React from 'react';

interface Prize {
    id: number;
    name: string;
    description: string;
    amount: string;
}

interface PrizeDetailsProps {
    prize: Prize;
}

const PrizeDetails: React.FC<PrizeDetailsProps> = ({ prize }) => {
    return (
        <div>
            <h3>{prize.name}</h3>
            <p>{prize.description}</p>
            <p>Amount: {prize.amount} ETH</p>
        </div>
    );
};

export default PrizeDetails;