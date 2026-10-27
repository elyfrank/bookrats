import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth';
import { joinGroup } from '@/lib/db';
import { onPendingInvite, takePendingInvite } from '@/lib/invite';
import { useNotifications } from '@/lib/notifications';
import { ThemeProvider, errorMessage, useTheme } from '@/lib/ui';

function RootStack() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const userId = session?.user.id;
  useNotifications(userId);

  // Convite recebido por link (ver +native-intent.tsx): entra no grupo assim que houver alguém
  // logado, e também quando um link chega com o app já aberto. O código é descartado antes de
  // tentar, então um convite inválido avisa uma vez só.
  useEffect(() => {
    if (!userId) return;
    let busy = false;
    const handleInvite = () => {
      if (busy) return;
      const code = takePendingInvite();
      if (!code) return;
      busy = true;
      joinGroup(code)
        .then((group) => router.push({ pathname: '/group/[id]', params: { id: group.id } }))
        .catch((e) => Alert.alert('Convite', errorMessage(e)))
        .finally(() => {
          busy = false;
          handleInvite();
        });
    };
    handleInvite();
    return onPendingInvite(handleInvite);
  }, [userId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="group/[id]" options={{ title: 'Grupo' }} />
        <Stack.Screen name="rules" options={{ title: 'Como funciona a pontuação' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}
