import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth';
import { takePendingInvite } from '@/lib/invite';
import { ThemeProvider, useTheme } from '@/lib/ui';

function RootStack() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  // Convite aberto antes do login: entra no grupo assim que a pessoa fizer login.
  useEffect(() => {
    if (!session) return;
    const code = takePendingInvite();
    if (code) router.push({ pathname: '/join', params: { code } });
  }, [session]);

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
      <Stack.Screen name="join" options={{ title: 'Convite' }} />
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
