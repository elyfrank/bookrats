import { Tabs } from 'expo-router';
import { Image, type ColorValue, type ImageSourcePropType } from 'react-native';

const icons = {
  leitura: require('../../../public/icones/png-branco/72px/leitura.png'),
  grupos: require('../../../public/icones/png-branco/72px/grupos.png'),
  configuracoes: require('../../../public/icones/png-branco/72px/configuracoes.png'),
};

// Ícone branco pintado com a cor da aba (ativa ou inativa), que já segue o tema claro/escuro.
function icon(source: ImageSourcePropType) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Image source={source} style={{ width: size, height: size, tintColor: color }} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Leitura', tabBarIcon: icon(icons.leitura) }} />
      <Tabs.Screen name="groups" options={{ title: 'Grupos', tabBarIcon: icon(icons.grupos) }} />
      <Tabs.Screen name="settings" options={{ title: 'Configurações', tabBarIcon: icon(icons.configuracoes) }} />
    </Tabs>
  );
}
