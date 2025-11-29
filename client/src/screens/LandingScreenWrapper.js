import React from 'react';
import StarField from '../components/StarField';
import { Landing } from '../components/Landing';

export function LandingScreenWrapper({ onTryFree, onCreateAccount, onSignIn }) {
    return (
        <div>
            <StarField />
            <Landing 
                onTryFree={onTryFree}
                onCreateAccount={onCreateAccount}
                onSignIn={onSignIn}
            />
        </div>
    );
}
