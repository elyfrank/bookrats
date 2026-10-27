import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import type { NotificationResponse } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// O Expo Go no Android não tem os módulos nativos de push: só carregar expo-notifications já
// derruba o app. Lá (e na web) as notificações ficam desligadas; no APK funcionam normalmente.
const Notifications: typeof import('expo-notifications') | null =
  isRunningInExpoGo() || Platform.OS === 'web'
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports -- import condicional (ver acima)
    require('expo-notifications');

// Mostra a notificação mesmo com o app aberto.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let currentToken: string | null = null;
// Usuário cujo aparelho já foi registrado nesta execução do app (evita pedir permissão de novo).
let registeredFor: string | null = null;

// Pede permissão e registra o token deste aparelho no banco (quem envia é o banco, ver migração 006).
async function registerForPush(userId: string) {
  if (!Notifications || registeredFor === userId) return;
  registeredFor = userId;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Leituras dos amigos',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', { push_token: data });
  if (error) throw error;
  currentToken = data;
}

// Chamar antes de sair da conta, para o aparelho parar de receber avisos dessa conta.
export async function unregisterForPush() {
  if (!currentToken) return;
  await supabase.rpc('unregister_push_token', { push_token: currentToken });
  currentToken = null;
  registeredFor = null;
}

// Ao tocar na notificação, abre o grupo indicado nela.
function openFromNotification(response: NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url !== 'string') return;
  Notifications?.clearLastNotificationResponse();
  router.push(url as Href);
}

// Depende só do id do usuário: a sessão é renovada periodicamente (e ao voltar do pedido de
// permissão), e reagir a cada renovação pedia permissão de novo, em ciclo.
export function useNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !Notifications) return;
    // Sem permissão ou sem internet: o app segue funcionando sem avisos.
    registerForPush(userId).catch((e) => console.warn('Notificações indisponíveis:', e));

    // Notificação que abriu o app (estava fechado) e as tocadas com o app aberto.
    openFromNotification(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => subscription.remove();
  }, [userId]);
}
