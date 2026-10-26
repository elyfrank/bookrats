import { isAuthError } from '@supabase/supabase-js';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { Button, Card, Input, colors, errorMessage, styles } from '@/lib/ui';

// O Supabase devolve mensagens em inglês; traduz as mais comuns pelo código do erro.
const authErrors: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos',
  user_already_exists: 'Este e-mail já está cadastrado',
  weak_password: 'A senha precisa ter pelo menos 6 caracteres',
  validation_failed: 'Verifique o e-mail e a senha',
  email_address_invalid: 'E-mail inválido',
  otp_expired: 'Código inválido ou expirado',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde um pouco e tente de novo',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente de novo',
};

function authErrorMessage(e: unknown) {
  return (isAuthError(e) && e.code && authErrors[e.code]) || errorMessage(e);
}

export default function SignIn() {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function goTo(next: typeof mode) {
    setError('');
    setCode('');
    setMode(next);
  }

  async function submit() {
    setError('');
    if (mode === 'signup' && !name.trim()) return setError('Informe seu nome');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error?.code === 'email_not_confirmed') {
          await supabase.auth.resend({ type: 'signup', email: email.trim() });
          return goTo('verify');
        }
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        // Sem sessão = o projeto exige confirmação; o e-mail traz o código.
        if (!data.session) goTo('verify');
      } else {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' });
        if (error) throw error;
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) setError(authErrorMessage(error));
    else Alert.alert('Código reenviado', `Confira a caixa de entrada de ${email.trim()}.`);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: 'center' }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { fontSize: 36, textAlign: 'center' }]}>📚 Bookrats</Text>
          <Text style={[styles.muted, { textAlign: 'center' }]}>Leia com seus amigos. Cada página vale 1 ponto.</Text>
          {mode === 'verify' ? (
            <Card>
              <Text style={styles.subtitle}>Confirme seu e-mail</Text>
              <Text style={styles.muted}>Enviamos um código para {email.trim()}. Digite-o abaixo.</Text>
              <Input
                placeholder="Código"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={8}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Button title="Confirmar" onPress={submit} loading={loading} />
              <Button title="Reenviar código" variant="secondary" onPress={resend} />
            </Card>
          ) : (
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
          )}
          <Pressable onPress={() => goTo(mode === 'login' ? 'signup' : 'login')}>
            <Text style={{ textAlign: 'center', color: colors.primary }}>
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : mode === 'signup' ? 'Já tem conta? Entrar' : 'Voltar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
