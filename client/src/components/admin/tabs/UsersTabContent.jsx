import React, { useState } from 'react';

/**
 * Users Tab Content
 * Displays user compliance status with filtering options
 */
export function UsersTabContent({ data }) {
  const [filter, setFilter] = useState('all');

  return (
    <div className="tab-content">
      <div className="users-filter">
        <label>Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Users</option>
          <option value="compliant">Compliant</option>
          <option value="non-compliant">Non-Compliant</option>
          <option value="requires-action">Requires Action</option>
        </select>
      </div>
      <p className="info-text">
        Total users in this view: {data.userStatus?.pagination?.total || 0}
      </p>
      {/* User list would be rendered here with pagination */}
    </div>
  );
}
