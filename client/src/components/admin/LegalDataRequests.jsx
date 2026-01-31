/**
 * Legal Data Requests Dashboard
 * For retrieving user data for legal/compliance purposes
 * 
 * REFACTORED: Separated concerns into hooks and sub-components
 * - API logic: hooks/useLegalDataRequestApi.js
 * - State management: hooks/useLegalDataRequest.js
 * - UI components: subcomponents/
 * - Styles: LegalDataRequests.module.css
 */

import React from 'react';
import useLegalDataRequest from './hooks/useLegalDataRequest';
import LegalWarningBox from './subcomponents/LegalWarningBox';
import LegalStatusMessages from './subcomponents/LegalStatusMessages';
import UserSearchStep from './subcomponents/UserSearchStep';
import GeneratePackageStep from './subcomponents/GeneratePackageStep';
import DownloadResultsStep from './subcomponents/DownloadResultsStep';
import styles from './LegalDataRequests.module.css';

/**
 * Main Legal Data Requests Component
 * @param {Object} props
 * @param {string} props.token - Authentication token
 */
export default function LegalDataRequests({ token }) {
  const {
    // Form state
    email,
    setEmail,
    requestedBy,
    setRequestedBy,
    requestReason,
    setRequestReason,
    // Data state
    userInfo,
    dataPackage,
    // UI state
    isLoading,
    error,
    success,
    // Methods
    findUser,
    generatePackage,
    downloadPackage,
    resetForm
  } = useLegalDataRequest(token);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>⚖️ Legal Data Requests</h2>
          <p className={styles.subtitle}>Retrieve user data for legal/compliance purposes</p>
        </div>
      </div>

      {/* Warning Box */}
      <LegalWarningBox />

      {/* Status Messages */}
      <LegalStatusMessages error={error} success={success} />

      {/* Step 1: Find User */}
      <UserSearchStep
        email={email}
        setEmail={setEmail}
        onSubmit={findUser}
        isLoading={isLoading}
        userInfo={userInfo}
      />

      {/* Step 2: Generate Package (shown after user found) */}
      {userInfo && (
        <GeneratePackageStep
          requestedBy={requestedBy}
          setRequestedBy={setRequestedBy}
          requestReason={requestReason}
          setRequestReason={setRequestReason}
          onSubmit={generatePackage}
          isLoading={isLoading}
        />
      )}

      {/* Step 3: Download Results (shown after package generated) */}
      {dataPackage && (
        <DownloadResultsStep
          dataPackage={dataPackage}
          onDownload={downloadPackage}
          onReset={resetForm}
        />
      )}
    </div>
  );
}
