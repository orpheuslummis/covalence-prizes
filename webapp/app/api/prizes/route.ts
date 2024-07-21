import { NextResponse } from 'next/server';
import { getPrizeContract } from '../../utils/contractHelpers';

export async function GET() {
    try {
        const contract = await getPrizeContract();
        const prizes = await contract.getAllPrizes();
        return NextResponse.json(prizes);
    } catch (error) {
        console.error('Error fetching prizes:', error);
        return NextResponse.json({ error: 'Failed to fetch prizes' }, { status: 500 });
    }
}