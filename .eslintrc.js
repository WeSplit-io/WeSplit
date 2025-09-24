module.exports = {
  extends: [
    'expo',
    '@react-native',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  plugins: [
    'import',
    'unused-imports'
  ],
  rules: {
    // Import rules
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/features/*/api/**',
            from: './src/features/*/ui/**',
            message: 'UI components cannot import from API layer'
          },
          {
            target: './src/features/*/ui/**',
            from: './src/features/*/model/**',
            message: 'UI components cannot import from model layer'
          },
          {
            target: './src/libs/**',
            from: './src/features/**',
            message: 'Shared libraries cannot import from features'
          },
          {
            target: './src/components/**',
            from: './src/features/**',
            message: 'Shared components cannot import from features'
          },
          {
            target: './src/config/**',
            from: './src/features/**',
            message: 'Configuration cannot import from features'
          }
        ]
      }
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react-native-qrcode-svg', 'expo-barcode-scanner', 'expo-camera'],
            message: 'Direct QR library imports are not allowed. Use @features/qr instead.'
          }
        ]
      }
    ],
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-duplicates': 'error',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    
    // Unused imports
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_'
      }
    ],
    
    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off', // Handled by unused-imports
    'prefer-const': 'error',
    'no-var': 'error',
    
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': 'off', // Handled by unused-imports
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // React rules
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    
    // React Native rules
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn'
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    }
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
};
