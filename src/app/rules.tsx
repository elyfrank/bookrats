import { ScrollView, Text } from 'react-native';

import { FINISH_MIN_PAGES } from '@/lib/db';
import { Card, useTheme } from '@/lib/ui';

// Mantenha em sincronia com a função score_days (supabase/migrations/004_pontos_por_grupo.sql), onde os pontos são calculados.
export default function RulesScreen() {
  const { styles } = useTheme();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.subtitle}>📄 Páginas</Text>
        <Text style={styles.text}>1 ponto por página até 50 páginas no dia.</Text>
        <Text style={styles.text}>Depois disso, meio ponto por página, até o máximo de 100 pontos por dia.</Text>
      </Card>
      <Card>
        <Text style={styles.subtitle}>✅ Leitura do dia</Text>
        <Text style={styles.text}>+10 pontos quando você lê pelo menos 5 páginas no dia.</Text>
      </Card>
      <Card>
        <Text style={styles.subtitle}>🔥 Sequência</Text>
        <Text style={styles.text}>
          +2 pontos por dia seguido lendo pelo menos 5 páginas: 1º dia +2, 2º dia +4, 3º dia +6… até +20 a partir do
          10º dia.
        </Text>
        <Text style={styles.text}>Se passar um dia sem ler 5 páginas, a sequência recomeça do zero.</Text>
      </Card>
      <Card>
        <Text style={styles.subtitle}>🏁 Livro concluído</Text>
        <Text style={styles.text}>
          +30 pontos no dia em que você marca um livro como concluído (botão &quot;Concluí&quot; em &quot;Lendo agora&quot;).
        </Text>
        <Text style={styles.text}>Vale para livros com pelo menos {FINISH_MIN_PAGES} páginas registradas.</Text>
      </Card>
      <Card>
        <Text style={styles.subtitle}>👥 Pontos no grupo</Text>
        <Text style={styles.text}>
          No ranking de um grupo só contam as leituras registradas depois que você entrou nele. A sequência também
          começa do zero no grupo, e só valem livros concluídos a partir da sua entrada.
        </Text>
        <Text style={styles.text}>Se você sair e entrar de novo, a contagem no grupo recomeça.</Text>
        <Text style={styles.muted}>Seus pontos totais, na aba Leitura, continuam contando tudo.</Text>
      </Card>
      <Card>
        <Text style={styles.subtitle}>Exemplo</Text>
        <Text style={styles.text}>Ana lê 20 páginas por dia durante 7 dias: 266 pontos.</Text>
        <Text style={styles.text}>Beto lê 200 páginas num único dia: 112 pontos.</Text>
        <Text style={styles.muted}>Ler um pouco todo dia vale mais do que ler muito de uma vez só!</Text>
      </Card>
    </ScrollView>
  );
}
