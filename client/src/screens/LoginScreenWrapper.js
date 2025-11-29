import React from 'react';
import StarField from '../components/StarField';
import { Login } from '../components/Login';

export function LoginScreenWrapper() {
    return (
        <div>
            <StarField />
            <Login />
        </div>
    );
}
