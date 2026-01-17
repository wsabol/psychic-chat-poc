/**
 * AnalyticsTab - Analytics tab content
 */

import React from 'react';
import { MessageDisplay } from './MessageDisplay';
import { ActionButtons } from './ActionButtons';
import { ReportDisplay } from './ReportDisplay';

export function AnalyticsTab({
  isLoading,
  report,
  error,
  message,
  onFetchReport,
  onExportJSON,
  onCleanupOldData,
  onDeleteAllData,
}) {
  return (
    <div>
      <MessageDisplay error={error} message={message} />

      <ActionButtons
        isLoading={isLoading}
        hasReport={!!report}
        onFetchReport={onFetchReport}
        onExportJSON={onExportJSON}
        onCleanupOldData={onCleanupOldData}
        onDeleteAllData={onDeleteAllData}
      />

      <ReportDisplay report={report} />
    </div>
  );
}
