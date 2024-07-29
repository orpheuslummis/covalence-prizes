import { QueryKey, UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Address } from 'viem';
import { usePublicClient, useWriteContract } from 'wagmi';
import { useAppContext } from '../app/AppContext';
import { useError } from '../app/ErrorContext';

export const useContractInteraction = () => {
    const { handleError } = useError();
    const { isLoading: appLoading } = useAppContext();
    const queryClient = useQueryClient();
    const publicClient = usePublicClient();
    const { writeContractAsync } = useWriteContract();

    const ensurePublicClient = () => {
        if (!publicClient) throw new Error('Public client is not available');
        return publicClient;
    };

    const readContract = async <T>(contract: { address: Address; abi: any }, functionName: string, args: any[] = []): Promise<T> => {
        const client = ensurePublicClient();
        return client.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName,
            args,
        }) as Promise<T>;
    };

    const writeContract = async (contract: { address: Address; abi: any }, functionName: string, args: any[] = [], overrides = {}) => {
        const client = ensurePublicClient();
        const { request } = await client.simulateContract({
            address: contract.address,
            abi: contract.abi,
            functionName,
            args,
            ...overrides,
        });
        return writeContractAsync(request);
    };

    const createQuery = <TQueryFnData, TError = Error, TData = TQueryFnData>(
        queryKey: QueryKey,
        queryFn: () => Promise<TQueryFnData>,
        options: Omit<UseQueryOptions<TQueryFnData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'> = {}
    ) => {
        return useQuery({
            queryKey,
            queryFn,
            ...options,
            enabled: !!publicClient && (options.enabled ?? true),
        });
    };

    const createMutation = <TVariables, TData, TError = Error>(
        mutationFn: (variables: TVariables) => Promise<TData>,
        errorMessage: string,
        invalidateKeys: string[]
    ) =>
        useMutation({
            mutationFn,
            onSuccess: () => invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] })),
            onError: (error: TError) => handleError(errorMessage, error),
        });

    const watchContractEvent = (contract: { address: Address; abi: any }, eventName: string, callback: () => void) => {
        const client = ensurePublicClient();
        return client.watchContractEvent({
            address: contract.address,
            abi: contract.abi,
            eventName,
            onLogs: callback,
        });
    };

    return {
        readContract,
        writeContract,
        createQuery,
        createMutation,
        watchContractEvent,
        isLoading: !publicClient || appLoading,
    };
};