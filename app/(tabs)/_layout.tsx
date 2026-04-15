import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { LayoutDashboard, PlusCircle, PiggyBank, Settings } from 'lucide-react-native'
import { he } from '../../src/locales/he'

const ICON_SIZE = 22
const ADD_ICON_SIZE = 26

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: he.nav.dashboard,
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View
              className="rounded-full p-3 -mt-4 shadow-lg"
              style={{ backgroundColor: focused ? '#6366f1' : 'rgba(99,102,241,0.9)' }}
            >
              <PlusCircle size={ADD_ICON_SIZE} color="#ffffff" strokeWidth={2.5} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: he.nav.planning,
          tabBarIcon: ({ color }) => (
            <PiggyBank size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: he.nav.settings,
          tabBarIcon: ({ color }) => (
            <Settings size={ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
