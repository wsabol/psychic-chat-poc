import React from 'react';

/**
 * Versions Tab Content
 * Displays acceptance rates by document version
 */
export function VersionsTabContent({ data }) {
  if (!data.acceptanceByVersion) return null;

  const getAcceptanceRateClass = (percentage) => {
    if (percentage >= 80) return 'high';
    if (percentage >= 50) return 'medium';
    return 'low';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="tab-content">
      <table className="data-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Version</th>
            <th>Total Users</th>
            <th>Accepted</th>
            <th>Acceptance %</th>
            <th>Requires Action</th>
            <th>Latest Acceptance</th>
          </tr>
        </thead>
        <tbody>
          {data.acceptanceByVersion.breakdown?.map((row, idx) => (
            <tr key={idx}>
              <td>{row.documentType === 'terms' ? '📋 Terms' : '🔒 Privacy'}</td>
              <td><strong>{row.version}</strong></td>
              <td>{row.totalUsers}</td>
              <td>{row.acceptedCount}</td>
              <td className={`acceptance-rate ${getAcceptanceRateClass(row.acceptancePercentage)}`}>
                {row.acceptancePercentage}%
              </td>
              <td>{row.requiresAction}</td>
              <td>{formatDate(row.latestAcceptance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
