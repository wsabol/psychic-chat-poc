import React from 'react';

/**
 * Reusable Form Select Component
 * Handles select inputs with validation, error display, and options
 */
export function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  optional = false,
  error = null,
  hint = null,
  placeholder = '-- Select --',
  ...rest
}) {
  return (
    <div className={`form-group ${error ? 'form-group-error' : ''}`}>
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
        {optional && <span className="optional">(Optional)</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`form-input form-select ${error ? 'form-input-error' : ''}`}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((option, idx) => (
          <option key={idx} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <span className="field-error-message">{error}</span>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
}

export default FormSelect;
