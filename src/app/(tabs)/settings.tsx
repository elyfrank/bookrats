import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { getProfile, updateName } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input, errorMessage, useTheme, type ThemeMode } from '@/lib/ui';

const themeOptions: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Sistema' },
  { mode: 'light', label: 'Claro' },
  { mode: 'dark', label: 'Escuro' },
];

export default function SettingsScreen() {
  const { session } = useAuth();
  const { mode, setMode, styles } = useTheme();
  const userId = session!.user.id;
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile(userId)
      .then((p) => {
        setName(p.name);
        setSavedName(p.name);
      })
      .catch((e) => Alert.alert('Erro', errorMessage(e)));
  }, [userId]);

  async function saveName() {
    if (!name.trim()) return Alert.alert('Informe seu nome');
    setSaving(true);
    try {
      await updateName(userId, name);
      setSavedName(name.trim());
      Alert.alert('Nome atualizado');
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sair da conta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={styles.subtitle}>Perfil</Text>
        <Text style={styles.muted}>{session!.user.email}</Text>
        <Input placeholder="Seu nome" value={name} onChangeText={setName} maxLength={60} />
        {name.trim() !== savedName && <Button title="Salvar nome" onPress={saveName} loading={saving} />}
      </Card>

      <Card>
        <Text style={styles.subtitle}>Aparência</Text>
        <View style={styles.row}>
          {themeOptions.map((o) => (
            <View key={o.mode} style={{ flex: 1 }}>
              <Button
                title={o.label}
                variant={mode === o.mode ? 'primary' : 'secondary'}
                onPress={() => setMode(o.mode)}
              />
            </View>
          ))}
        </View>
        <Text style={styles.muted}>&quot;Sistema&quot; segue o modo claro/escuro do celular.</Text>
      </Card>

      <Button title="Regras de pontuação" variant="secondary" onPress={() => router.push('/rules')} />

      <Button title="Sair da conta" variant="danger" onPress={confirmSignOut} />

      <Text style={[styles.muted, { textAlign: 'center' }]}>Bookrats v{Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}
