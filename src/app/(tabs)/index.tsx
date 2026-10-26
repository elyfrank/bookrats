import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import {
  FINISH_MIN_PAGES,
  addReading,
  createBook,
  deleteReading,
  myBooks,
  myDailyScores,
  myReadings,
  setBookFinished,
  today,
  type Book,
  type DailyScore,
  type ReadingLog,
} from '@/lib/db';
import { Button, Card, Input, errorMessage, useTheme } from '@/lib/ui';

export default function ReadingScreen() {
  const { colors, styles } = useTheme();
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [scores, setScores] = useState<DailyScore[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  // undefined = a pessoa ainda não escolheu; usa o livro da última leitura.
  const [chosenBookId, setChosenBookId] = useState<string | null | undefined>(undefined);
  const [addingBook, setAddingBook] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [pages, setPages] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, s, b] = await Promise.all([myReadings(), myDailyScores(), myBooks()]);
      setLogs(l);
      setScores(s);
      setBooks(b);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const reading = books.filter((b) => !b.finished_on);
  const finished = books.filter((b) => b.finished_on).sort((a, b) => b.finished_on!.localeCompare(a.finished_on!));
  const titleOf = new Map(books.map((b) => [b.id, b.title]));
  const pagesOf = new Map<string, number>();
  for (const log of logs) {
    if (log.book_id) pagesOf.set(log.book_id, (pagesOf.get(log.book_id) ?? 0) + log.pages);
  }
  const lastBookId = logs.find((l) => l.book_id)?.book_id ?? null;
  const wantedBookId = chosenBookId === undefined ? lastBookId : chosenBookId;
  const selectedBookId = reading.some((b) => b.id === wantedBookId) ? wantedBookId : null;

  async function save() {
    const n = parseInt(pages, 10);
    if (!n || n < 1) return Alert.alert('Quantas páginas?', 'Digite um número maior que zero.');
    if (addingBook && !newTitle.trim()) return Alert.alert('Qual livro?', 'Digite o nome do livro novo.');
    setSaving(true);
    try {
      let bookId = selectedBookId;
      if (addingBook) {
        bookId = (await createBook(newTitle)).id;
        setChosenBookId(bookId);
        setAddingBook(false);
        setNewTitle('');
      }
      await addReading(n, bookId);
      setPages('');
      await load();
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmFinish(book: Book) {
    const read = pagesOf.get(book.id) ?? 0;
    const message =
      read >= FINISH_MIN_PAGES
        ? 'Você ganha +30 pontos hoje. 🎉'
        : `Você registrou ${read} páginas deste livro. O bônus de +30 só vale a partir de ${FINISH_MIN_PAGES} páginas registradas.`;
    Alert.alert(`Concluiu "${book.title}"?`, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Concluí 🏁', onPress: () => updateFinished(book, today()) },
    ]);
  }

  function confirmUnfinish(book: Book) {
    Alert.alert(`Desmarcar "${book.title}"?`, 'O livro volta para "Lendo agora" e o bônus de conclusão é removido.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desmarcar', style: 'destructive', onPress: () => updateFinished(book, null) },
    ]);
  }

  async function updateFinished(book: Book, finishedOn: string | null) {
    try {
      await setBookFinished(book.id, finishedOn);
      await load();
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
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

  const total = scores.reduce((sum, s) => sum + s.points, 0);
  const todayScore = scores.find((s) => s.read_on === today());
  // A sequência continua viva se o último dia válido foi hoje ou ontem.
  const lastStreakDay = scores.find((s) => s.streak_days > 0);
  const streak = lastStreakDay && lastStreakDay.read_on >= today(-1) ? lastStreakDay.streak_days : 0;

  const stat = (label: string, value: string) => (
    <View style={{ flex: 1 }}>
      <Card>
        <Text style={styles.muted}>{label}</Text>
        <Text style={[styles.bigNumber, { fontSize: 28 }]}>{value}</Text>
      </Card>
    </View>
  );

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : 'transparent',
      }}
    >
      <Text style={{ color: selected ? colors.onPrimary : colors.text }}>{label}</Text>
    </Pressable>
  );

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
        {stat('Pontos', String(total))}
        {stat('Hoje', String(todayScore?.points ?? 0))}
        {stat('Sequência', `🔥 ${streak}`)}
      </View>

      <Card>
        <Text style={styles.subtitle}>Registrar leitura de hoje</Text>
        <Text style={styles.muted}>Livro</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {reading.map((b) =>
            chip(b.title, !addingBook && selectedBookId === b.id, () => {
              setAddingBook(false);
              setChosenBookId(selectedBookId === b.id ? null : b.id);
            }),
          )}
          {chip('+ Novo livro', addingBook, () => setAddingBook(!addingBook))}
        </View>
        {addingBook && <Input placeholder="Nome do livro" value={newTitle} onChangeText={setNewTitle} maxLength={200} />}
        <Input placeholder="Páginas lidas" value={pages} onChangeText={setPages} keyboardType="number-pad" />
        <Button title="Salvar" onPress={save} loading={saving} />
        {todayScore && todayScore.pages > 0 && todayScore.pages < 5 && (
          <Text style={styles.muted}>Leia pelo menos 5 páginas hoje para ganhar +10 e manter a sequência.</Text>
        )}
      </Card>

      {reading.length > 0 && (
        <Card>
          <Text style={styles.subtitle}>Lendo agora</Text>
          {reading.map((b) => (
            <View key={b.id} style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.text}>📖 {b.title}</Text>
                <Text style={styles.muted}>{pagesOf.get(b.id) ?? 0} págs registradas</Text>
              </View>
              <Pressable onPress={() => confirmFinish(b)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Concluí 🏁</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.subtitle}>Histórico</Text>
      {scores.length === 0 && <Text style={styles.muted}>Nenhuma leitura registrada ainda.</Text>}
      {scores.map((day) => (
        <Card key={day.read_on}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.subtitle}>{formatDate(day.read_on)}</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>+{day.points} pts</Text>
          </View>
          <Text style={styles.muted}>{breakdown(day).join(' · ')}</Text>
          {logs
            .filter((log) => log.read_on === day.read_on)
            .map((log) => (
              <Pressable key={log.id} onLongPress={() => confirmDelete(log)}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Text style={[styles.text, { flex: 1 }]}>
                    📖 {(log.book_id && titleOf.get(log.book_id)) ?? 'Leitura'}
                  </Text>
                  <Text style={styles.muted}>{log.pages} págs</Text>
                </View>
              </Pressable>
            ))}
        </Card>
      ))}
      {scores.length > 0 && (
        <Text style={[styles.muted, { textAlign: 'center' }]}>Segure uma leitura para apagá-la.</Text>
      )}

      {finished.length > 0 && (
        <Card>
          <Text style={styles.subtitle}>Livros concluídos</Text>
          {finished.map((b) => (
            <Pressable key={b.id} onLongPress={() => confirmUnfinish(b)}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={[styles.text, { flex: 1 }]}>🏁 {b.title}</Text>
                <Text style={styles.muted}>{formatDate(b.finished_on!)}</Text>
              </View>
            </Pressable>
          ))}
          <Text style={styles.muted}>Segure um livro para desmarcar a conclusão.</Text>
        </Card>
      )}

      <Pressable onPress={() => router.push('/rules')}>
        <Text style={{ textAlign: 'center', color: colors.primary }}>Como funciona a pontuação?</Text>
      </Pressable>
    </ScrollView>
  );
}

function breakdown(day: DailyScore) {
  const parts = [];
  if (day.pages) parts.push(`+${day.page_points} de ${day.pages} págs`);
  if (day.daily_bonus) parts.push(`+${day.daily_bonus} leitura do dia`);
  if (day.streak_bonus) parts.push(`+${day.streak_bonus} 🔥 ${day.streak_days} ${day.streak_days === 1 ? 'dia' : 'dias'}`);
  if (day.finish_bonus) {
    parts.push(`+${day.finish_bonus} 🏁 ${day.books_finished === 1 ? 'livro concluído' : `${day.books_finished} livros concluídos`}`);
  }
  return parts;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
