import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { getGroup, groupRanking, leaveGroup, type Group, type RankingRow } from '@/lib/db';
import { Button, Card, errorMessage, useTheme } from '@/lib/ui';

const medals = ['🥇', '🥈', '🥉'];

export default function GroupScreen() {
  const { colors, styles } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [period, setPeriod] = useState<'total' | 'week'>('total');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [g, r] = await Promise.all([getGroup(id), groupRanking(id)]);
      setGroup(g);
      setRanking(r);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const points = (r: RankingRow) => (period === 'total' ? r.total_points : r.week_points);
  const sorted = [...ranking].sort((a, b) => points(b) - points(a));
  const myRow = ranking.find((r) => r.user_id === session?.user.id);
  const myJoin = myRow ? new Date(myRow.joined_at) : null;

  function confirmLeave() {
    Alert.alert('Sair do grupo?', group?.name, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(id, session!.user.id);
            router.back();
          } catch (e) {
            Alert.alert('Erro', errorMessage(e));
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Stack.Screen options={{ title: group?.name ?? 'Grupo' }} />

      {group && (
        <Card>
          <Text style={styles.muted}>Código de convite</Text>
          <Text style={[styles.title, { letterSpacing: 4 }]}>{group.invite_code}</Text>
          <Button
            title="Convidar amigos"
            variant="secondary"
            onPress={() =>
              Share.share({
                message: `Entra no meu grupo "${group.name}" no Bookrats! Código: ${group.invite_code}`,
              })
            }
          />
        </Card>
      )}

      {myJoin && (
        <Text style={styles.muted}>
          No grupo só contam as leituras registradas depois que cada pessoa entrou. Você entrou em{' '}
          {myJoin.toLocaleDateString('pt-BR')}.
        </Text>
      )}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            title="Geral"
            variant={period === 'total' ? 'primary' : 'secondary'}
            onPress={() => setPeriod('total')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Últimos 7 dias"
            variant={period === 'week' ? 'primary' : 'secondary'}
            onPress={() => setPeriod('week')}
          />
        </View>
      </View>

      {sorted.map((r, i) => {
        const isMe = r.user_id === session?.user.id;
        return (
          <Card key={r.user_id}>
            <View style={styles.row}>
              <Text style={{ width: 32, fontSize: 20, textAlign: 'center', color: colors.muted }}>
                {medals[i] ?? `${i + 1}º`}
              </Text>
              <Text style={{ flex: 1, fontSize: 16, color: colors.text, fontWeight: isMe ? '700' : '400' }}>
                {r.name}
                {isMe ? ' (você)' : ''}
                {r.streak_days > 0 && <Text style={{ color: colors.muted }}>{`  🔥 ${r.streak_days}`}</Text>}
              </Text>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>{points(r)} pts</Text>
            </View>
          </Card>
        );
      })}

      <Button title="Sair do grupo" variant="danger" onPress={confirmLeave} />
    </ScrollView>
  );
}
