import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { addReading, deleteReading, myReadings, today, type ReadingLog } from '@/lib/db';
import { Button, Card, Input, errorMessage, useTheme } from '@/lib/ui';

export default function ReadingScreen() {
  const { colors, styles } = useTheme();
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [pages, setPages] = useState('');
  const [book, setBook] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLogs(await myReadings());
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function save() {
    const n = parseInt(pages, 10);
    if (!n || n < 1) return Alert.alert('Quantas páginas?', 'Digite um número maior que zero.');
    setSaving(true);
    try {
      await addReading(n, book);
      setPages('');
      await load();
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(log: ReadingLog) {
    Alert.alert('Apagar leitura?', `${log.pages} páginas em ${formatDate(log.read_on)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReading(log.id);
            await load();
          } catch (e) {
            Alert.alert('Erro', errorMessage(e));
          }
        },
      },
    ]);
  }

  const total = logs.reduce((sum, l) => sum + l.pages, 0);
  const todayPages = logs.filter((l) => l.read_on === today()).reduce((sum, l) => sum + l.pages, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Card>
            <Text style={styles.muted}>Seus pontos</Text>
            <Text style={styles.bigNumber}>{total}</Text>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card>
            <Text style={styles.muted}>Páginas hoje</Text>
            <Text style={styles.bigNumber}>{todayPages}</Text>
          </Card>
        </View>
      </View>

      <Card>
        <Text style={styles.subtitle}>Registrar leitura de hoje</Text>
        <Input placeholder="Páginas lidas" value={pages} onChangeText={setPages} keyboardType="number-pad" />
        <Input placeholder="Livro (opcional)" value={book} onChangeText={setBook} />
        <Button title="Salvar" onPress={save} loading={saving} />
      </Card>

      <Text style={styles.subtitle}>Histórico</Text>
      {logs.length === 0 && <Text style={styles.muted}>Nenhuma leitura registrada ainda.</Text>}
      {logs.map((log) => (
        <Pressable key={log.id} onLongPress={() => confirmDelete(log)}>
          <Card>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{log.book_title ?? 'Leitura'}</Text>
                <Text style={styles.muted}>{formatDate(log.read_on)}</Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>+{log.pages} pts</Text>
            </View>
          </Card>
        </Pressable>
      ))}
      {logs.length > 0 && <Text style={[styles.muted, { textAlign: 'center' }]}>Segure um item para apagá-lo.</Text>}
    </ScrollView>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
