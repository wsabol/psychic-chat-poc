import React from 'react';
import { useTranslation } from '../context/TranslationContext';

export function LoadingScreen() {
  const { t } = useTranslation();
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            fontSize: '1.2rem'
        }}>
            {t('common.loading')}
        </div>
    );
}
