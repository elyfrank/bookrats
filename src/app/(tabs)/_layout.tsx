import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function icon(emoji: string) {
  return function TabIcon() {
    return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
  };
}

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Leitura', tabBarIcon: icon('📖') }} />
      <Tabs.Screen name="groups" options={{ title: 'Grupos', tabBarIcon: icon('👥') }} />
      <Tabs.Screen name="settings" options={{ title: 'Configurações', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
