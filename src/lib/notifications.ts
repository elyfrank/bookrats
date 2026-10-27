import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Mostra a notificação mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let currentToken: string | null = null;

// Pede permissão e registra o token deste aparelho no banco (quem envia é o banco, ver migração 006).
async function registerForPush() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Leituras dos amigos',
      importance: AndroidImportance.HIGH,
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
}

export function useNotifications(session: Session | null) {
  useEffect(() => {
    if (!session) return;
    // Falha no Expo Go (sem push no Android) ou sem internet: o app segue funcionando sem avisos.
    registerForPush().catch((e) => console.warn('Notificações indisponíveis:', e));
  }, [session]);

  // Ao tocar na notificação, abre o grupo indicado nela.
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (!session || typeof url !== 'string') return;
    Notifications.clearLastNotificationResponse();
    router.push(url as Href);
  }, [response, session]);
}
