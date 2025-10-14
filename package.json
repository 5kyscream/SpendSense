import React from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import UploadScreen from './screens/UploadScreen'
import OverviewScreen from './screens/OverviewScreen'
import SettingsScreen from './screens/SettingsScreen'
import { theme } from './lib/theme'

const Tab = createBottomTabNavigator()

export default function App() {
  return (
    <SafeAreaProvider style={styles.container}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.onSurface,
            tabBarStyle: { backgroundColor: theme.colors.surface },
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Upload') {
                return <MaterialCommunityIcons name="camera-plus" size={size} color={color} />
              }
              if (route.name === 'Overview') {
                return <MaterialCommunityIcons name="chart-pie" size={size} color={color} />
              }
              return <MaterialCommunityIcons name="cog" size={size} color={color} />
            },
          })}
        >
          <Tab.Screen name="Upload" component={UploadScreen} />
          <Tab.Screen name="Overview" component={OverviewScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})