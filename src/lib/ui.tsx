import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors = {
  bg: '#FAF7F2',
  card: '#FFFFFF',
  text: '#2B2118',
  muted: '#7A6A5C',
  primary: '#B5532F',
  border: '#E6DDD3',
  danger: '#B3261E',
};

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const filled = variant === 'primary';
  const fg = filled ? '#fff' : variant === 'danger' ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        filled ? { backgroundColor: colors.primary } : { borderColor: fg, borderWidth: 1 },
        (pressed || loading) && { opacity: 0.7 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

// Mensagem de erro legível a partir do que o Supabase devolve.
export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Algo deu errado';
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  muted: { color: colors.muted },
  bigNumber: { fontSize: 40, fontWeight: '800', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger },
});
