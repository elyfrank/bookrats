import { supabase } from './supabase';

export type Group = { id: string; name: string; invite_code: string };
export type ReadingLog = { id: string; read_on: string; pages: number; book_id: string | null };
export type Book = { id: string; title: string; finished_on: string | null };
export type RankingRow = {
  user_id: string;
  name: string;
  total_points: number;
  week_points: number;
  streak_days: number;
  joined_at: string;
};
// Pontos de um dia (calculados no banco pela função score_days, ver supabase/migrations/004_pontos_por_grupo.sql).
export type DailyScore = {
  read_on: string;
  pages: number;
  page_points: number;
  daily_bonus: number;
  streak_days: number;
  streak_bonus: number;
  books_finished: number;
  finish_bonus: number;
  points: number;
};

// Páginas registradas que um livro precisa ter para o bônus de conclusão (igual à migração 003).
export const FINISH_MIN_PAGES = 50;

// Data local no formato YYYY-MM-DD (toISOString usaria UTC e erraria o dia à noite).
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, notify_readings, notify_joins')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export type Profile = { name: string; notify_readings: boolean; notify_joins: boolean };
export type NotifyPref = 'notify_readings' | 'notify_joins';

export async function setNotifyPref(userId: string, pref: NotifyPref, enabled: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ [pref]: enabled })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateName(userId: string, name: string) {
  const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', userId);
  if (error) throw error;
}

export async function addReading(pages: number, bookId: string | null) {
  const { error } = await supabase.from('reading_logs').insert({ pages, book_id: bookId, read_on: today() });
  if (error) throw error;
}

export async function myBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, finished_on')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Book[];
}

export async function createBook(title: string) {
  const { data, error } = await supabase
    .from('books')
    .insert({ title: title.trim() })
    .select('id, title, finished_on')
    .single();
  if (error) throw error;
  return data as Book;
}

// finishedOn = null desmarca a conclusão.
export async function setBookFinished(id: string, finishedOn: string | null) {
  const { error } = await supabase.from('books').update({ finished_on: finishedOn }).eq('id', id);
  if (error) throw error;
}

export async function deleteReading(id: string) {
  const { error } = await supabase.from('reading_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function myReadings() {
  const { data, error } = await supabase
    .from('reading_logs')
    .select('id, read_on, pages, book_id')
    .order('read_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ReadingLog[];
}

export async function myDailyScores() {
  const { data, error } = await supabase
    .from('daily_scores')
    .select('read_on, pages, page_points, daily_bonus, streak_days, streak_bonus, books_finished, finish_bonus, points')
    .order('read_on', { ascending: false });
  if (error) throw error;
  return data as DailyScore[];
}

export async function myGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code')
    .order('created_at');
  if (error) throw error;
  return data as Group[];
}

export async function getGroup(id: string) {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Group;
}

export async function createGroup(name: string) {
  const { data, error } = await supabase.rpc('create_group', { group_name: name });
  if (error) throw error;
  return data as Group;
}

export async function joinGroup(code: string) {
  const { data, error } = await supabase.rpc('join_group', { code });
  if (error) throw error;
  return data as Group;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function groupRanking(groupId: string) {
  const { data, error } = await supabase.rpc('group_ranking', { gid: groupId });
  if (error) throw error;
  return data as RankingRow[];
}
