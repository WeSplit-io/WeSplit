/**
 * Form Validation Utilities
 * Centralized form validation functions and schemas
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormField {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => ValidationResult;
}

/**
 * Validate form field
 */
export function validateField(field: FormField, fieldName: string): ValidationResult {
  const errors: string[] = [];
  const { value, required, minLength, maxLength, pattern, customValidator } = field;

  // Check required
  if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  // Skip other validations if value is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: true, errors: [] };
  }

  const stringValue = String(value);

  // Check minimum length
  if (minLength && stringValue.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }

  // Check maximum length
  if (maxLength && stringValue.length > maxLength) {
    errors.push(`${fieldName} must be no more than ${maxLength} characters long`);
  }

  // Check pattern
  if (pattern && !pattern.test(stringValue)) {
    errors.push(`${fieldName} format is invalid`);
  }

  // Custom validator
  if (customValidator) {
    const customResult = customValidator(value);
    if (!customResult.isValid) {
      errors.push(...customResult.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate entire form
 */
export function validateForm(fields: Record<string, FormField>): ValidationResult {
  const allErrors: string[] = [];
  let isValid = true;

  for (const [fieldName, field] of Object.entries(fields)) {
    const result = validateField(field, fieldName);
    if (!result.isValid) {
      isValid = false;
      allErrors.push(...result.errors);
    }
  }

  return {
    isValid,
    errors: allErrors
  };
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+(\.\d+)?$/,
  url: /^https?:\/\/.+/,
  solanaAddress: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  ethereumAddress: /^0x[a-fA-F0-9]{40}$/,
};

/**
 * Common field validators
 */
const FieldValidators = {
  required: (value: any) => ({
    isValid: value !== null && value !== undefined && value !== '',
    errors: value ? [] : ['This field is required']
  }),

  email: (value: string) => ({
    isValid: ValidationPatterns.email.test(value),
    errors: ValidationPatterns.email.test(value) ? [] : ['Invalid email format']
  }),

  phone: (value: string) => ({
    isValid: ValidationPatterns.phone.test(value),
    errors: ValidationPatterns.phone.test(value) ? [] : ['Invalid phone number format']
  }),

  username: (value: string) => ({
    isValid: ValidationPatterns.username.test(value),
    errors: ValidationPatterns.username.test(value) ? [] : ['Username must be 3-30 characters, alphanumeric and underscores only']
  }),

  password: (value: string) => {
    const errors: string[] = [];
    
    if (value.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(value)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  amount: (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const isValid = !isNaN(numValue) && numValue > 0 && numValue < Number.MAX_SAFE_INTEGER;
    
    return {
      isValid,
      errors: isValid ? [] : ['Invalid amount']
    };
  },

  solanaAddress: (value: string) => ({
    isValid: ValidationPatterns.solanaAddress.test(value),
    errors: ValidationPatterns.solanaAddress.test(value) ? [] : ['Invalid Solana address format']
  }),

  ethereumAddress: (value: string) => ({
    isValid: ValidationPatterns.ethereumAddress.test(value),
    errors: ValidationPatterns.ethereumAddress.test(value) ? [] : ['Invalid Ethereum address format']
  }),
};

/**
 * Create form validation schema
 */
function createValidationSchema(schema: Record<string, Partial<FormField>>) {
  return (values: Record<string, any>) => {
    const fields: Record<string, FormField> = {};
    
    for (const [fieldName, fieldConfig] of Object.entries(schema)) {
      fields[fieldName] = {
        value: values[fieldName] || '',
        ...fieldConfig
      };
    }
    
    return validateForm(fields);
  };
}

/**
 * Debounced validation
 */
function createDebouncedValidator(
  validator: (value: any) => ValidationResult,
  delay: number = 300
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (value: any, callback: (result: ValidationResult) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
}

/**
 * Async validation
 */
async function validateAsync(
  value: any,
  validator: (value: any) => Promise<ValidationResult>
): Promise<ValidationResult> {
  try {
    return await validator(value);
  } catch (error) {
    return {
      isValid: false,
      errors: ['Validation error occurred']
    };
  }
}

/**
 * Validate form with async fields
 */
async function validateFormAsync(
  fields: Record<string, FormField & { asyncValidator?: (value: any) => Promise<ValidationResult> }>
): Promise<ValidationResult> {
  const allErrors: string[] = [];
  let isValid = true;

  // Validate sync fields first
  for (const [fieldName, field] of Object.entries(fields)) {
    const { asyncValidator, ...syncField } = field;
    const result = validateField(syncField, fieldName);
    
    if (!result.isValid) {
      isValid = false;
      allErrors.push(...result.errors);
    }
  }

  // Validate async fields
  for (const [fieldName, field] of Object.entries(fields)) {
    if (field.asyncValidator) {
      const result = await validateAsync(field.value, field.asyncValidator);
      if (!result.isValid) {
        isValid = false;
        allErrors.push(...result.errors);
      }
    }
  }

  return {
    isValid,
    errors: allErrors
  };
}
