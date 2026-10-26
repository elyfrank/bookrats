import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { joinGroup } from '@/lib/db';
import { savePendingInvite } from '@/lib/invite';
import { Button, errorMessage, useTheme } from '@/lib/ui';

// Aberta pelo link de convite (bookrats://join?code=XXXXXX).
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { session } = useAuth();
  const { colors, styles } = useTheme();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      router.replace('/');
      return;
    }
    if (!session) {
      savePendingInvite(code);
      router.replace('/sign-in');
      return;
    }
    joinGroup(code)
      .then((group) => {
        router.replace('/groups');
        router.push({ pathname: '/group/[id]', params: { id: group.id } });
      })
      .catch((e) => setError(errorMessage(e)));
  }, [code, session]);

  return (
    <View style={[styles.screen, styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
      {error ? (
        <>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>Não foi possível entrar no grupo</Text>
          <Text style={[styles.muted, { textAlign: 'center' }]}>{error}</Text>
          <View style={{ alignSelf: 'stretch' }}>
            <Button title="Ir para Grupos" onPress={() => router.replace('/groups')} />
          </View>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Entrando no grupo…</Text>
        </>
      )}
    </View>
  );
}
