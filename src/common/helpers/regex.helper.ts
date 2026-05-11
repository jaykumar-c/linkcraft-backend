export const REGEX = {
  USERNAME: /^[a-zA-Z0-9_]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
} as const;

export const VALIDATION_MESSAGES = {
  USERNAME: {
    MIN_LENGTH: 'Username must be at least 3 characters',
    INVALID_FORMAT: 'Username can only contain letters, numbers, and underscores',
  },
  EMAIL: {
    INVALID_FORMAT: 'Invalid email format',
  },
  PASSWORD: {
    MIN_LENGTH: 'Password must be at least 8 characters',
    WEAK: 'Password must contain at least one letter and one number',
  },
} as const;