import React from 'react';

/**
 * Notifications Tab Content
 * Displays notification delivery and effectiveness metrics
 */
export function NotificationsTabContent({ data }) {
  if (!data.notificationMetrics) return null;

  const MetricPair = ({ label, value }) => (
    <div className="metric-pair">
      <span>{label}:</span>
      <strong>{value}</strong>
    </div>
  );

  const metrics = data.notificationMetrics.metrics;

  return (
    <div className="tab-content">
      <div className="notification-metrics">
        <div className="metric-block">
          <h4>Notification Delivery</h4>
          <MetricPair
            label="Notified Users"
            value={metrics?.notificationStats.notified}
          />
          <MetricPair
            label="Not Yet Notified"
            value={metrics?.notificationStats.notYetNotified}
          />
          <MetricPair
            label="Notification Rate"
            value={`${metrics?.notificationStats.notificationRate}%`}
          />
        </div>

        <div className="metric-block">
          <h4>Acceptance After Notification</h4>
          <MetricPair
            label="Accepted After Notification"
            value={metrics?.acceptanceAfterNotification.accepted}
          />
          <MetricPair
            label="Still Requires Action"
            value={metrics?.acceptanceAfterNotification.stillRequiresAction}
          />
          <MetricPair
            label="Acceptance Rate"
            value={`${metrics?.acceptanceAfterNotification.acceptanceRate}%`}
          />
        </div>

        <div className="metric-block">
          <h4>Notification Statistics</h4>
          <MetricPair
            label="Avg Notifications per User"
            value={metrics?.averageNotificationsPerUser}
          />
          <MetricPair
            label="Max Notifications Sent"
            value={metrics?.maxNotificationsSent}
          />
        </div>
      </div>
    </div>
  );
}
