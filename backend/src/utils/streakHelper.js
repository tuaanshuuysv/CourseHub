// Chuan hoa du lieu chuoi ngay hoc de tinh chinh xac currentStreak theo ngay hien tai (UTC YYYY-MM-DD)
export function formatLearningStreak(streakDoc) {
  if (!streakDoc) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      activeDates: [],
    };
  }

  const raw = typeof streakDoc.toObject === 'function' ? streakDoc.toObject() : { ...streakDoc };
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const lastActive = typeof raw.lastActiveDate === 'string' ? raw.lastActiveDate : '';
  const isStreakAlive = lastActive === today || lastActive === yesterday;

  return {
    ...raw,
    currentStreak: isStreakAlive ? Number(raw.currentStreak || 0) : 0,
    longestStreak: Number(raw.longestStreak || 0),
    lastActiveDate: lastActive,
    activeDates: Array.isArray(raw.activeDates) ? raw.activeDates : [],
  };
}
