import React from 'react';

/**
 * Reusable Form Section Component
 * Groups related form fields with a title
 */
export function FormSection({
  title,
  icon = null,
  children,
  className = ''
}) {
  return (
    <section className={`form-section ${className}`}>
      <h3 className="heading-secondary">
        {icon && <span>{icon} </span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

export default FormSection;
