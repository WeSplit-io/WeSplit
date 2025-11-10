import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '../services/core';
import { colors } from '../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error Boundary caught an error', { error, errorInfo }, 'ErrorBoundary');
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: 20 
          }}>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: colors.black,
              marginBottom: 10 
            }}>
              Oops! Something went wrong
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: colors.GRAY,
              textAlign: 'center',
              marginBottom: 20 
            }}>
              We&apos;re sorry, but something unexpected happened. Please try again.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primaryGreen,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8
              }}
              onPress={this.handleRetry}
            >
              <Text style={{ 
                color: colors.white, 
                fontSize: 16, 
                fontWeight: 'bold' 
              }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 