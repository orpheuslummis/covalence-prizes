import React from 'react';
import { useAppContext } from '../AppContext';
import { AppProvider } from '../AppContextProvider';
import { AppContextType } from '../types';

export function withAppContext<P extends { context?: AppContextType }>(
    WrappedComponent: React.ComponentType<P>
) {
    return function WithAppContext(props: Omit<P, 'context'>) {
        return (
            <AppProvider>
                <WrappedComponentWithContext {...props} />
            </AppProvider>
        );
    };

    function WrappedComponentWithContext(props: Omit<P, 'context'>) {
        const context = useAppContext();
        return <WrappedComponent {...(props as P)} context={context} />;
    }
}