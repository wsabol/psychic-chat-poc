import React from 'react';

/**
 * Timeline Tab Content
 * Displays acceptance timeline for the last 30 days
 */
export function TimelineTabContent({ data }) {
  if (!data.timeline) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="tab-content">
      <h3>Acceptance Timeline (Last 30 Days)</h3>
      <table className="timeline-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Terms Acceptances</th>
            <th>Privacy Acceptances</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.timeline.timeline?.map((day, idx) => (
            <tr key={idx}>
              <td>{formatDate(day.date)}</td>
              <td>{day.terms}</td>
              <td>{day.privacy}</td>
              <td><strong>{day.terms + day.privacy}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
