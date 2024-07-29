import { useError } from '../app/ErrorContext';

export const useErrorHandler = () => {
    const { error, handleError, clearError } = useError();
    return { error, handleError, clearError };
};