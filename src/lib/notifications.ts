import type { NotificationPrefs } from './auth';
import { supabase } from './supabase';

const BIBLE_VERSES = [
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ who strengthens me.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' },
  { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.' },
  { ref: 'Isaiah 41:10', text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.' },
  { ref: 'Psalm 23:1', text: 'The Lord is my shepherd, I lack nothing.' },
  { ref: 'Joshua 1:9', text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.' },
  { ref: 'Matthew 6:33', text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
  { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
  { ref: '1 Corinthians 16:13', text: 'Be on your guard; stand firm in the faith; be courageous; be strong.' },
  { ref: 'Deuteronomy 31:6', text: 'Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you.' },
  { ref: 'Psalm 37:5', text: 'Commit your way to the Lord; trust in him and he will do this.' },
];

const MOTIVATIONS = [
  'Your only limit is you. Push past it today.',
  'Small steps every day lead to big results. Keep going.',
  'Discipline is choosing what you want most over what you want now.',
  'You do not have to be great to start, but you have to start to be great.',
  'The secret of getting ahead is getting started.',
  'What you do today can improve all your tomorrows.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Your future is created by what you do today, not tomorrow.',
  'Do something today that your future self will thank you for.',
  'The best way to predict the future is to create it.',
  'Energy and persistence conquer all things.',
  'You are never too old to set another goal or to dream a new dream.',
];

function pickByDate<T>(arr: T[]): T {
  const day = Math.floor(Date.now() / 86400000);
  return arr[day % arr.length];
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function showNotification(title: string, body: string, tag = 'lifeos', view?: string) {
  if (Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const options: NotificationOptions & { vibrate?: number[] } = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag,
    data: view ? { view } : {},
    vibrate: [80, 40, 80],
  };
  if (reg) {
    reg.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
}

export async function sendDailyBrief(_prefs: NotificationPrefs) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'todo')
    .order('priority');
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('start_time', new Date().toISOString())
    .lte('start_time', new Date(Date.now() + 86400000).toISOString())
    .order('start_time');

  const lines: string[] = [];
  if (events && events.length) lines.push(`${events.length} event(s) today`);
  if (tasks && tasks.length) lines.push(`${tasks.length} pending task(s)`);
  const topTask = tasks?.[0];
  if (topTask) lines.push(`Priority: ${topTask.title}`);
  const body = lines.length ? lines.join(' · ') : 'Your slate is clear today.';
  await showNotification('Good morning — your daily brief', body, 'lifeos-brief', 'home');
}

export async function sendEveningReflection() {
  await showNotification(
    'Evening reflection',
    'Take a moment to journal your wins, challenges, and lessons today.',
    'lifeos-evening',
    'journal',
  );
}

export async function sendMotivation() {
  const m = pickByDate(MOTIVATIONS);
  await showNotification('Daily motivation', m, 'lifeos-motivation', 'home');
}

export async function sendBibleVerse() {
  const v = pickByDate(BIBLE_VERSES);
  await showNotification(`Bible verse — ${v.ref}`, v.text, 'lifeos-bible', 'home');
}

export async function sendTaskReminder() {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'todo')
    .order('priority')
    .limit(3);
  if (!tasks || tasks.length === 0) {
    await showNotification('Life OS', 'You are all caught up. No pending tasks.', 'lifeos-tasks');
    return;
  }
  const top = tasks[0];
  const others = tasks.slice(1).map((t) => t.title).join(', ');
  const body = others ? `Start with: ${top.title}. Then: ${others}.` : `Start with: ${top.title}.`;
  await showNotification('Your most important task', body, 'lifeos-tasks', 'tasks');
}

export async function sendPrayerReminder() {
  await showNotification('Time to pray', 'Take 5 minutes for prayer and reflection. It centers your day.', 'lifeos-prayer', 'habits');
}

// Run scheduled checks — called periodically by the app
export async function runScheduledNotifications(prefs: NotificationPrefs) {
  if (!prefs.enabled || Notification.permission !== 'granted') return;
  const now = new Date();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  const brief = prefs.briefHour * 60 + prefs.briefMinute;
  const evening = prefs.eveningHour * 60 + prefs.eveningMinute;

  // Use a 2-minute window so we don't fire repeatedly
  const lastKey = 'lifeos-last-notif';
  const last = parseInt(localStorage.getItem(lastKey) ?? '0', 10);
  const nowMin = Math.floor(Date.now() / 60000);
  if (nowMin - last < 2) return;

  if (prefs.dailyBrief && Math.abs(hhmm - brief) <= 1) {
    localStorage.setItem(lastKey, String(nowMin));
    await sendDailyBrief(prefs);
  } else if (prefs.eveningReflection && Math.abs(hhmm - evening) <= 1) {
    localStorage.setItem(lastKey, String(nowMin));
    await sendEveningReflection();
  } else if (prefs.motivation && now.getHours() === 8 && now.getMinutes() < 2) {
    localStorage.setItem(lastKey, String(nowMin));
    await sendMotivation();
  } else if (prefs.bibleVerse && now.getHours() === 6 && now.getMinutes() < 2) {
    localStorage.setItem(lastKey, String(nowMin));
    await sendBibleVerse();
  } else if (prefs.taskReminders && (now.getHours() === 9 || now.getHours() === 13 || now.getHours() === 18) && now.getMinutes() < 2) {
    localStorage.setItem(lastKey, String(nowMin));
    await sendTaskReminder();
  }
}

export function getTodayVerse() {
  return pickByDate(BIBLE_VERSES);
}
export function getTodayMotivation() {
  return pickByDate(MOTIVATIONS);
}
export { BIBLE_VERSES, MOTIVATIONS };
