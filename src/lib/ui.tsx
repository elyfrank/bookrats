import 'expo-sqlite/localStorage/install';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
} from 'react-native';

const palettes = {
  light: {
    bg: '#FAF7F2',
    card: '#FFFFFF',
    input: '#FFFFFF',
    text: '#2B2118',
    muted: '#7A6A5C',
    primary: '#B5532F',
    onPrimary: '#FFFFFF',
    border: '#E6DDD3',
    danger: '#B3261E',
  },
  dark: {
    bg: '#17130F',
    card: '#221C17',
    input: '#2B241E',
    text: '#F2EAE1',
    muted: '#A8998B',
    primary: '#E07A52',
    onPrimary: '#1A120D',
    border: '#3A3029',
    danger: '#F2B8B5',
  },
};

export type Colors = typeof palettes.light;
export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'bookrats.themeMode';

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 16 },
    title: { fontSize: 24, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    text: { fontSize: 16, color: colors.text },
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
      backgroundColor: colors.input,
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
}

type Theme = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: 'light' | 'dark';
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
};

const ThemeContext = createContext<Theme | null>(null);

function loadMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {}
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(loadMode);
  const systemScheme = useColorScheme();
  const scheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const theme = useMemo<Theme>(() => {
    const colors = palettes[scheme];
    return {
      mode,
      setMode: (next) => {
        setModeState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {}
      },
      scheme,
      colors,
      styles: makeStyles(colors),
    };
  }, [mode, scheme]);

  // Cores das barras de navegação (cabeçalho e abas) acompanham o tema do app.
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.bg,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme precisa estar dentro de ThemeProvider');
  return theme;
}

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
  const { colors, styles } = useTheme();
  const filled = variant === 'primary';
  const fg = filled ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.primary;
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
  const { colors, styles } = useTheme();
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Card({ children }: { children: ReactNode }) {
  const { styles } = useTheme();
  return <View style={styles.card}>{children}</View>;
}

// Mensagem de erro legível a partir do que o Supabase devolve.
export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Algo deu errado';
}
