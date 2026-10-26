import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { createGroup, joinGroup, myGroups, type Group } from '@/lib/db';
import { Button, Card, Input, colors, errorMessage, styles } from '@/lib/ui';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  const load = useCallback(async () => {
    try {
      setGroups(await myGroups());
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(kind: 'create' | 'join', action: () => Promise<Group>) {
    setBusy(kind);
    try {
      const group = await action();
      setNewName('');
      setCode('');
      router.push({ pathname: '/group/[id]', params: { id: group.id } });
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>Meus grupos</Text>
      {groups.length === 0 && <Text style={styles.muted}>Você ainda não participa de nenhum grupo.</Text>}
      {groups.map((g) => (
        <Pressable key={g.id} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}>
          <Card>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{g.name}</Text>
              <Text style={styles.muted}>Ver ranking ›</Text>
            </View>
          </Card>
        </Pressable>
      ))}

      <Card>
        <Text style={styles.subtitle}>Entrar com código</Text>
        <Input placeholder="Ex.: K7PQ2M" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={6} />
        <Button
          title="Entrar no grupo"
          loading={busy === 'join'}
          onPress={() => (code.trim() ? run('join', () => joinGroup(code)) : undefined)}
        />
      </Card>

      <Card>
        <Text style={styles.subtitle}>Criar grupo</Text>
        <Input placeholder="Nome do grupo" value={newName} onChangeText={setNewName} maxLength={60} />
        <Button
          title="Criar"
          variant="secondary"
          loading={busy === 'create'}
          onPress={() => (newName.trim() ? run('create', () => createGroup(newName)) : undefined)}
        />
      </Card>
    </ScrollView>
  );
}
