import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="foods" options={{ title: 'Foods' }} />
      <Tabs.Screen name="meals" options={{ title: 'Meals' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
