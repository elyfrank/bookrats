import { supabase } from './supabase';

export type Group = { id: string; name: string; invite_code: string };
export type ReadingLog = { id: string; read_on: string; pages: number; book_title: string | null };
export type RankingRow = { user_id: string; name: string; total_points: number; week_points: number };

// Data local no formato YYYY-MM-DD (toISOString usaria UTC e erraria o dia à noite).
export function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function addReading(pages: number, bookTitle: string) {
  const { error } = await supabase
    .from('reading_logs')
    .insert({ pages, book_title: bookTitle.trim() || null, read_on: today() });
  if (error) throw error;
}

export async function deleteReading(id: string) {
  const { error } = await supabase.from('reading_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function myReadings() {
  const { data, error } = await supabase
    .from('reading_logs')
    .select('id, read_on, pages, book_title')
    .order('read_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ReadingLog[];
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
