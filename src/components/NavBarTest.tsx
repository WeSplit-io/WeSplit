import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NavBar from './NavBar';
import { colors } from '../theme';

/**
 * Test component to visualize NavBar alignment and sizing
 * This component helps debug alignment issues
 */
const NavBarTest: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Debug grid overlay */}
      <View style={styles.debugGrid}>
        <View style={styles.gridLine} />
        <View style={styles.gridLine} />
        <View style={styles.gridLine} />
        <View style={styles.gridLine} />
        <View style={styles.gridLine} />
      </View>
      
      {/* Debug info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>NavBar Test - Bottom Alignment</Text>
        <Text style={styles.debugText}>All icons should be aligned at bottom</Text>
        <Text style={styles.debugText}>Nav icons: 28x28px</Text>
        <Text style={styles.debugText}>Special button: 48x48px with 24x24px icon</Text>
        <Text style={styles.debugText}>All text labels should be on same line</Text>
      </View>
      
      {/* NavBar */}
      <NavBar 
        navigation={{}}
        currentRoute="GroupsList"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  debugGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 100,
    zIndex: 1,
  },
  gridLine: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  debugInfo: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 2,
  },
  debugText: {
    color: colors.white,
    fontSize: 12,
    marginBottom: 4,
  },
});

export default NavBarTest; 