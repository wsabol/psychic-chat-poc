import React from 'react';

/**
 * Overview Tab Content
 * Displays summary metrics and current document versions
 */
export function OverviewTabContent({ data }) {
  const overview = data.overview?.data || data.overview;

  if (!overview) return null;

  const MetricCard = ({ label, value, help, isWarning = false }) => (
    <div className={`metric-card ${isWarning ? 'warning' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-help">{help}</div>
    </div>
  );

  return (
    <div className="tab-content">
      <div className="metrics-grid">
        <MetricCard
          label="Total Users"
          value={overview.metrics?.totalUsers || 0}
          help="Registered users"
        />

        <MetricCard
          label="Overall Compliance"
          value={`${overview.metrics?.compliancePercentage}%`}
          help={`${overview.metrics?.fullyCompliant} compliant users`}
        />

        <MetricCard
          label="Terms Compliance"
          value={`${overview.metrics?.termsCompliancePercentage}%`}
          help={`v${overview.currentVersions?.terms.version}`}
        />

        <MetricCard
          label="Privacy Compliance"
          value={`${overview.metrics?.privacyCompliancePercentage}%`}
          help={`v${overview.currentVersions?.privacy.version}`}
        />

        <MetricCard
          label="Requires Action"
          value={overview.metrics?.requiresAction}
          help={`${overview.metrics?.requiresActionPercentage}% of users`}
          isWarning={true}
        />
      </div>

      <div className="current-versions">
        <h3>Current Versions</h3>
        <div className="version-info">
          <div className="version-item">
            <strong>Terms of Service</strong>
            <span className="version-badge">{overview.currentVersions?.terms.version}</span>
            <small>{overview.currentVersions?.terms.changeType}</small>
          </div>
          <div className="version-item">
            <strong>Privacy Policy</strong>
            <span className="version-badge">{overview.currentVersions?.privacy.version}</span>
            <small>{overview.currentVersions?.privacy.changeType}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
