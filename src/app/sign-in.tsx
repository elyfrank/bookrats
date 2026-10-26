import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { Button, Card, Input, colors, errorMessage, styles } from '@/lib/ui';

export default function SignIn() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (mode === 'signup' && !name.trim()) return setError('Informe seu nome');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        // Sem sessão = o projeto Supabase exige confirmação por e-mail.
        if (!data.session) {
          Alert.alert('Confirme seu e-mail', 'Enviamos um link de confirmação. Depois é só entrar.');
          setMode('login');
        }
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: 'center' }]}>
          <Text style={[styles.title, { fontSize: 36, textAlign: 'center' }]}>📚 Bookrats</Text>
          <Text style={[styles.muted, { textAlign: 'center' }]}>Leia com seus amigos. Cada página vale 1 ponto.</Text>
          <Card>
            {mode === 'signup' && <Input placeholder="Seu nome" value={name} onChangeText={setName} />}
            <Input
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Button title={mode === 'login' ? 'Entrar' : 'Criar conta'} onPress={submit} loading={loading} />
          </Card>
          <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={{ textAlign: 'center', color: colors.primary }}>
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
