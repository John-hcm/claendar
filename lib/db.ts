import { supabase } from './supabaseClient';

export type EntryCategory = {
  id: string;
  user_id: string;
  name: string;
  color_bg: string;
  color_text: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DailyEntry = {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  occurred_at: string;
  category_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CalendarEvent = {
  id: string;
  user_id: string;
  event_type: 'appointment' | 'anniversary';
  title: string;
  content: string | null;
  category_id: string | null;
  calendar_kind: 'solar' | 'lunar_kr';
  is_recurring_yearly: boolean;
  solar_date: string;
  start_time: string | null;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function fetchCategories(userId: string) {
  const { data, error } = await supabase
    .from('entry_categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EntryCategory[];
}

export async function createCategory(input: {
  user_id: string;
  name: string;
  color_bg: string;
  color_text: string;
  sort_order?: number;
}) {
  const { data, error } = await supabase
    .from('entry_categories')
    .insert({
      user_id: input.user_id,
      name: input.name,
      color_bg: input.color_bg,
      color_text: input.color_text,
      sort_order: input.sort_order ?? 0,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as EntryCategory;
}


export async function updateCategory(input: {
  user_id: string;
  id: string;
  name?: string;
  color_bg?: string;
  color_text?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const patch: Record<string, any> = {};
  if (typeof input.name === 'string') patch.name = input.name;
  if (typeof input.color_bg === 'string') patch.color_bg = input.color_bg;
  if (typeof input.color_text === 'string') patch.color_text = input.color_text;
  if (typeof input.sort_order === 'number') patch.sort_order = input.sort_order;
  if (typeof input.is_active === 'boolean') patch.is_active = input.is_active;

  const { data, error } = await supabase
    .from('entry_categories')
    .update(patch)
    .eq('user_id', input.user_id)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as EntryCategory;
}

// 카테고리 삭제(비활성화)
export async function deactivateCategory(userId: string, categoryId: string) {
  const { data, error } = await supabase
    .from('entry_categories')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) throw error;
  return data as EntryCategory;
}

export async function fetchEntriesByRange(userId: string, startYmd: string, endYmd: string) {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('entry_date', startYmd)
    .lte('entry_date', endYmd)
    .order('occurred_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyEntry[];
}

export async function fetchDailyEntryById(userId: string, entryId: string) {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('id', entryId)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data as DailyEntry;
}

export async function updateDailyEntry(input: {
  user_id: string;
  id: string;
  category_id: string;
  title?: string | null;
  content: string;
  entry_date?: string; // optional: allow moving date if needed
}) {
  const { data, error } = await supabase
    .from('daily_entries')
    .update({
      category_id: input.category_id,
      title: input.title ?? null,
      content: input.content,
      ...(input.entry_date ? { entry_date: input.entry_date } : {}),
    })
    .eq('user_id', input.user_id)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as DailyEntry;
}

export async function deleteDailyEntry(userId: string, entryId: string) {
  const { data, error } = await supabase
    .from('daily_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', entryId)
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function fetchEventsByRange(userId: string, startYmd: string, endYmd: string) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('solar_date', startYmd)
    .lte('solar_date', endYmd)
    .order('solar_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function fetchEventById(userId: string, eventId: string) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('id', eventId)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data as CalendarEvent;
}

export async function updateEvent(input: {
  user_id: string;
  id: string;
  event_type: 'appointment' | 'anniversary';
  title: string;
  content?: string | null;
  category_id?: string | null;
  calendar_kind: 'solar' | 'lunar_kr';
  is_recurring_yearly: boolean;
  solar_date: string;
  start_time?: string | null;
  is_all_day: boolean;
}) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      event_type: input.event_type,
      title: input.title,
      content: input.content ?? null,
      category_id: input.category_id ?? null,
      calendar_kind: input.calendar_kind,
      is_recurring_yearly: input.is_recurring_yearly,
      solar_date: input.solar_date,
      start_time: input.start_time ?? null,
      is_all_day: input.is_all_day,
    })
    .eq('user_id', input.user_id)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as CalendarEvent;
}

export async function deleteEvent(userId: string, eventId: string) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', eventId)
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function createDailyEntry(input: {
  user_id: string;
  entry_date: string;
  category_id: string;
  title?: string | null;
  content: string;
  occurred_at?: string;
}) {
  const { data, error } = await supabase
    .from('daily_entries')
    .insert({
      user_id: input.user_id,
      entry_date: input.entry_date,
      category_id: input.category_id,
      title: input.title ?? null,
      content: input.content,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as DailyEntry;
}

export async function createEvent(input: {
  user_id: string;
  event_type: 'appointment' | 'anniversary';
  title: string;
  content?: string | null;
  category_id?: string | null;
  calendar_kind: 'solar' | 'lunar_kr';
  is_recurring_yearly: boolean;
  solar_date: string;
  start_time?: string | null;
  is_all_day: boolean;
}) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: input.user_id,
      event_type: input.event_type,
      title: input.title,
      content: input.content ?? null,
      category_id: input.category_id ?? null,
      calendar_kind: input.calendar_kind,
      is_recurring_yearly: input.is_recurring_yearly,
      solar_date: input.solar_date,
      start_time: input.start_time ?? null,
      is_all_day: input.is_all_day,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as CalendarEvent;
}
