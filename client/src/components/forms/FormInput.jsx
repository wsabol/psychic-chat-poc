import React from 'react';

/**
 * Reusable Form Input Component
 * Handles text inputs with validation, error display, and help text
 */
export function FormInput({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  optional = false,
  error = null,
  hint = null,
  autoComplete = 'off',
  ...rest
}) {
  return (
    <div className={`form-group ${error ? 'form-group-error' : ''}`}>
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
        {optional && <span className="optional">(Optional)</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className={`form-input ${error ? 'form-input-error' : ''}`}
        placeholder={placeholder}
        {...rest}
      />
      {error && <span className="field-error-message">{error}</span>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
}

export default FormInput;
