import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/lib/ui';

function icon(emoji: string) {
  return function TabIcon() {
    return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Leitura', tabBarIcon: icon('📖') }} />
      <Tabs.Screen name="groups" options={{ title: 'Grupos', tabBarIcon: icon('👥') }} />
    </Tabs>
  );
}
