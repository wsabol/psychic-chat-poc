import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * CareerSection - Displays career guidance and purpose information
 * Shows ideal careers, careers to avoid, and leadership style
 */
export function CareerSection({ careerSpecific }) {
  if (!careerSpecific) return null;

  return (
    <div className={styles.detailSection}>
      <h4>Career & Purpose</h4>
      
      {careerSpecific.ideal && (
        <div>
          <p><strong>Ideal Careers:</strong></p>
          <ul>
            {Array.isArray(careerSpecific.ideal)
              ? careerSpecific.ideal.map((job, idx) => (
                  <li key={idx}>{job}</li>
                ))
              : <li>{careerSpecific.ideal}</li>}
          </ul>
        </div>
      )}
      
      {careerSpecific.avoid && (
        <div>
          <p><strong>Best Avoided:</strong></p>
          <ul>
            {Array.isArray(careerSpecific.avoid)
              ? careerSpecific.avoid.map((career, idx) => (
                  <li key={idx}>{career}</li>
                ))
              : <li>{careerSpecific.avoid}</li>}
          </ul>
        </div>
      )}
      
      {careerSpecific.leadership && (
        <p><strong>Leadership Style:</strong> {careerSpecific.leadership}</p>
      )}
    </div>
  );
}
