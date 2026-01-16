# Configuration Files

This folder contains organized configuration files for the project.

## Structure

- **`build/`** - Build and deployment configuration
  - `lighthouserc.js` - Lighthouse CI configuration

- **`testing/`** - Testing configuration
  - `jest.config.js` - Jest test configuration
  - `jest.setup.js` - Jest setup file

- **`docs/`** - Documentation build configuration
  - `mkdocs.yml` - MkDocs configuration
  - `.gitbook.yml` - GitBook configuration

## Note

Some configuration files must remain in the root directory due to tool requirements:
- `package.json` - npm/Node.js requirement
- `tsconfig.json` - TypeScript requirement
- `babel.config.js` - Expo/Babel requirement
- `metro.config.js` - React Native/Expo requirement
- `react-native.config.js` - React Native requirement
- `eas.json` - Expo EAS requirement
- `app.config.js` - Expo requirement
