import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Three reminders per day. Identifier is stable per slot so we can update or
// cancel without scanning the full schedule.
export const MEAL_REMINDERS = [
  { slot: 'breakfast', hour: 10, minute: 0, body: 'Log your breakfast 🍳' },
  { slot: 'lunch', hour: 14, minute: 0, body: "Don't forget lunch 🥗" },
  { slot: 'dinner', hour: 21, minute: 0, body: 'Time to log dinner 🍽️' },
];

const ID_PREFIX = 'meal-reminder-';
const idFor = (slot) => `${ID_PREFIX}${slot}`;

export function isSupported() {
  return Platform.OS !== 'web';
}

let handlerConfigured = false;
export function configureNotificationHandler() {
  if (!isSupported() || handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

export async function requestNotificationPermissions() {
  if (!isSupported()) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelAllMealReminders() {
  if (!isSupported()) return;
  await Promise.all(
    MEAL_REMINDERS.map(({ slot }) =>
      Notifications.cancelScheduledNotificationAsync(idFor(slot)).catch(() => {})
    )
  );
}

// Schedules a daily-repeating reminder for each slot that doesn't already have
// a logged meal for today. Slots that *do* have one are cancelled — the daily
// trigger would otherwise keep firing tomorrow even after we've muted today.
// We re-schedule the full set every time so the next-day reminder is always
// armed, regardless of whether today was logged.
export async function scheduleMealReminders(loggedMeals = []) {
  if (!isSupported()) return;
  const permitted = (await Notifications.getPermissionsAsync()).granted;
  if (!permitted) return;

  const loggedSlots = new Set(
    (loggedMeals || []).map((m) => m && m.mealSlot).filter(Boolean)
  );
  const now = new Date();

  await Promise.all(
    MEAL_REMINDERS.map(async ({ slot, hour, minute, body }) => {
      const id = idFor(slot);
      // Always cancel the existing one first — scheduling with the same
      // identifier is treated as a fresh schedule, so this keeps the trigger
      // time honest after edits.
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

      // If today's slot is already logged AND the reminder time hasn't passed
      // yet, skip scheduling so it doesn't fire today. The daily trigger will
      // be re-armed by the next foreground refresh after midnight.
      const slotMomentToday = new Date(now);
      slotMomentToday.setHours(hour, minute, 0, 0);
      const isUpcomingToday = slotMomentToday > now;
      if (loggedSlots.has(slot) && isUpcomingToday) return;

      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: 'Macro',
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    })
  );
}
