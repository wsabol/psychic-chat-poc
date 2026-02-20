import React from 'react';
import { Login } from '../components/Login';

export function LoginScreenWrapper({ defaultMode = 'login' }) {
    return (
        <Login defaultMode={defaultMode} />
    );
}
