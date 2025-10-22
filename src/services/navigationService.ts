import { NavigationContainerRef } from '@react-navigation/native';
import { logger } from './loggingService';

class NavigationServiceClass {
  private navigationRef: NavigationContainerRef<any> | null = null;

  /**
   * Set the navigation reference
   */
  setNavigationRef(ref: NavigationContainerRef<any> | null) {
    this.navigationRef = ref;
    logger.info('Navigation reference set', { hasRef: !!ref }, 'NavigationService');
  }

  /**
   * Navigate to a screen
   */
  navigate(screen: string, params?: any) {
    if (!this.navigationRef) {
      logger.warn('Navigation reference not set, cannot navigate', { screen, params }, 'NavigationService');
      return;
    }

    try {
      this.navigationRef.navigate(screen, params);
      logger.info('Navigation successful', { screen, params }, 'NavigationService');
    } catch (error) {
      logger.error('Navigation failed', { screen, params, error }, 'NavigationService');
    }
  }

  /**
   * Go back
   */
  goBack() {
    if (!this.navigationRef) {
      logger.warn('Navigation reference not set, cannot go back', null, 'NavigationService');
      return;
    }

    try {
      this.navigationRef.goBack();
      logger.info('Go back successful', null, 'NavigationService');
    } catch (error) {
      logger.error('Go back failed', { error }, 'NavigationService');
    }
  }

  /**
   * Reset navigation stack
   */
  reset(routeName: string, params?: any) {
    if (!this.navigationRef) {
      logger.warn('Navigation reference not set, cannot reset', { routeName, params }, 'NavigationService');
      return;
    }

    try {
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
      logger.info('Navigation reset successful', { routeName, params }, 'NavigationService');
    } catch (error) {
      logger.error('Navigation reset failed', { routeName, params, error }, 'NavigationService');
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    if (!this.navigationRef) {
      logger.warn('Navigation reference not set, cannot get current route', null, 'NavigationService');
      return null;
    }

    try {
      const route = this.navigationRef.getCurrentRoute();
      logger.debug('Current route retrieved', { route: route?.name }, 'NavigationService');
      return route;
    } catch (error) {
      logger.error('Failed to get current route', { error }, 'NavigationService');
      return null;
    }
  }

  /**
   * Check if navigation is ready
   */
  isReady() {
    return !!this.navigationRef;
  }
}

// Export singleton instance
export const navigationService = new NavigationServiceClass();
export default navigationService;
