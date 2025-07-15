module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          sourceDir: '../node_modules/react-native-vector-icons/Fonts',
          fonts: [
            'Ionicons.ttf',
            'FontAwesome5_Regular.ttf',
            'FontAwesome5_Solid.ttf',
            'FontAwesome5_Brands.ttf'
          ]
        },
        android: {
          sourceDir: '../node_modules/react-native-vector-icons/Fonts',
          fonts: [
            'Ionicons.ttf',
            'FontAwesome5_Regular.ttf',
            'FontAwesome5_Solid.ttf',
            'FontAwesome5_Brands.ttf'
          ]
        }
      }
    }
  }
}; 