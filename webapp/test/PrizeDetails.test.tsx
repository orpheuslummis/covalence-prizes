import { render, screen } from '@testing-library/react';
import PrizeDetails from '../app/components/PrizeDetails';

describe('PrizeDetails', () => {
    it('renders prize details correctly', () => {
        const prize = {
            id: 1,
            name: 'Test Prize',
            description: 'This is a test prize',
            amount: '100',
        };

        render(<PrizeDetails prize={prize} />);

        expect(screen.getByText('Test Prize')).toBeInTheDocument();
        expect(screen.getByText('This is a test prize')).toBeInTheDocument();
        expect(screen.getByText('Amount: 100 ETH')).toBeInTheDocument();
    });
});