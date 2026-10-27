import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { getProfile, setNotifyPref, updateName, type NotifyPref } from '@/lib/db';
import { unregisterForPush } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input, errorMessage, useTheme, type ThemeMode } from '@/lib/ui';

const themeOptions: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Sistema' },
  { mode: 'light', label: 'Claro' },
  { mode: 'dark', label: 'Escuro' },
];

export default function SettingsScreen() {
  const { session } = useAuth();
  const { mode, setMode, colors, styles } = useTheme();
  const userId = session!.user.id;
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notify, setNotify] = useState<Record<NotifyPref, boolean>>({ notify_readings: true, notify_joins: true });

  useEffect(() => {
    getProfile(userId)
      .then((p) => {
        setName(p.name);
        setSavedName(p.name);
        setNotify({ notify_readings: p.notify_readings, notify_joins: p.notify_joins });
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

  async function toggleNotify(pref: NotifyPref, enabled: boolean) {
    setNotify((n) => ({ ...n, [pref]: enabled }));
    try {
      await setNotifyPref(userId, pref, enabled);
    } catch (e) {
      setNotify((n) => ({ ...n, [pref]: !enabled }));
      Alert.alert('Erro', errorMessage(e));
    }
  }

  const notifySwitch = (pref: NotifyPref, label: string) => (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <Text style={[styles.text, { flex: 1 }]}>{label}</Text>
      <Switch
        value={notify[pref]}
        onValueChange={(v) => toggleNotify(pref, v)}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );

  function confirmSignOut() {
    Alert.alert('Sair da conta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await unregisterForPush().catch(() => {});
          await supabase.auth.signOut();
        },
      },
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

      <Card>
        <Text style={styles.subtitle}>Notificações</Text>
        {notifySwitch('notify_readings', 'Avisar quando alguém dos meus grupos registrar uma leitura')}
        {notifySwitch('notify_joins', 'Avisar quando alguém entrar nos meus grupos')}
      </Card>

      <Button title="Regras de pontuação" variant="secondary" onPress={() => router.push('/rules')} />

      <Button title="Sair da conta" variant="danger" onPress={confirmSignOut} />

      <Text style={[styles.muted, { textAlign: 'center' }]}>BookRats v{Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}
