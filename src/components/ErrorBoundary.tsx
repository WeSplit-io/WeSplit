import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/core';
import ErrorScreen from './shared/ErrorScreen';

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
        <ErrorScreen
          title="Oops! Something went wrong"
          message="We're sorry, but something unexpected happened. Please try again."
          onRetry={this.handleRetry}
          retryText="Try Again"
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 