import React from 'react';
import { Landing } from '../components/Landing';

export function LandingScreenWrapper({ onTryFree, onCreateAccount, onSignIn }) {
    return (
        <Landing 
            onTryFree={onTryFree}
            onCreateAccount={onCreateAccount}
            onSignIn={onSignIn}
        />
    );
}
