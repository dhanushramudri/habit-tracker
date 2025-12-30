import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const HabitTracker2026 = ({ user, onLogout }) => {
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Uncategorized');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [viewMode, setViewMode] = useState('week');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(0);
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyNotes, setDailyNotes] = useState({});
  const [currentNote, setCurrentNote] = useState('');
  // Frontend will use backend API routes at /api (no client-side DB creds)
  const backendBase = 'http://localhost:4000/api';
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [categories, setCategories] = useState(['Health', 'Study', 'Work', 'Personal', 'Fitness', 'Uncategorized']);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  // Load user-specific data from backend (no localStorage fallback)
  useEffect(() => {
    if (!user) {
      setHabits([]);
      setDailyNotes({});
      return;
    }

    setLoading(true);

    // quick health check
    fetch(`${backendBase}/health`).then(r => r.json()).then(j => {
      setIsConnected(!!j.dbConnected);
    }).catch(() => setIsConnected(false));

    // load habits
    fetch(`${backendBase}/habits?username=${encodeURIComponent(user)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch habits');
        return r.json();
      })
      .then(result => {
        setHabits(result && result.documents ? result.documents : []);
      })
      .catch(err => {
        console.warn('Failed to load habits from backend', err);
        setHabits([]);
        setIsConnected(false);
      })
      .finally(() => setLoading(false));

    // load notes
    fetch(`${backendBase}/notes?username=${encodeURIComponent(user)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch notes');
        return r.json();
      })
      .then(result => {
        setDailyNotes(result && result.document ? result.document.notes || {} : {});
      })
      .catch(err => {
        console.warn('Failed to load notes from backend', err);
        setDailyNotes({});
        setIsConnected(false);
      });
  }, [user]);

  useEffect(() => {
    // NOTE: notes are saved explicitly via Save button only. Remove automatic persistence to avoid
    // unintended local changes. This effect intentionally does nothing.
  }, [dailyNotes, user]);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getCurrentWeekNumber = () => {
    const now = new Date();
    const start2026 = new Date(2026, 0, 1);
    const diff = now - start2026;
    return Math.max(0, Math.min(51, Math.floor(diff / (7 * 24 * 60 * 60 * 1000))));
  };

  useEffect(() => {
    setCurrentWeek(getCurrentWeekNumber());
    calculateStreaks();
  }, [habits]);

  const getWeekDates = (weekNum) => {
    const start2026 = new Date(2026, 0, 1);
    const firstDay = start2026.getDay();
    const daysToMonday = firstDay === 0 ? 1 : (8 - firstDay);
    const weekStart = new Date(2026, 0, 1 + daysToMonday + (weekNum * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getMonthDates = (monthNum) => {
    const daysInMonth = new Date(2026, monthNum + 1, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(2026, monthNum, i));
    }
    return dates;
  };

  const getAllDates = () => {
    const dates = [];
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(2026, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(2026, month, day));
      }
    }
    return dates;
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Remote backend helpers (use backend at /api)
  const createHabitRemote = async (habit) => {
    const res = await fetch(`${backendBase}/habits`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(habit)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => 'create failed');
      throw new Error(txt || 'Failed to create habit');
    }
    const json = await res.json();
    return json.insertedId;
  };

  const updateHabitRemote = async (habitId, updates) => {
    const res = await fetch(`${backendBase}/habits/${encodeURIComponent(habitId)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => 'update failed');
      throw new Error(txt || 'Failed to update habit');
    }
    return await res.json();
  };

  const deleteHabitRemote = async (habitId) => {
    const res = await fetch(`${backendBase}/habits/${encodeURIComponent(habitId)}`, { method: 'DELETE' });
    if (!res.ok) {
      const txt = await res.text().catch(() => 'delete failed');
      throw new Error(txt || 'Failed to delete habit');
    }
    return await res.json();
  };

  const loadNotesRemote = async () => {
    try {
      const res = await fetch(`${backendBase}/notes?username=${encodeURIComponent(user)}`);
      const json = await res.json();
      if (json && json.document) setDailyNotes(json.document.notes || {});
    } catch (e) {
      console.warn('loadNotesRemote failed', e);
    }
  };

  const saveNotesRemote = async (notes) => {
    const res = await fetch(`${backendBase}/notes`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, notes })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => 'save notes failed');
      throw new Error(txt || 'Failed to save notes');
    }
    return await res.json();
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) return;

    const newHabit = {
      year: 2026,
      name: newHabitName,
      category: newHabitCategory,
      goal: 30,
      completedDays: {},
      createdAt: new Date().toISOString()
    };

    // attach username for remote storage
    if (user) newHabit.username = user;
    try {
      const id = await createHabitRemote(newHabit);
      newHabit._id = id;
      setHabits([...habits, newHabit]);
    } catch (e) {
      console.error('Failed to create habit on server', e);
      alert('Failed to create habit on server. Please try again.');
      return;
    }
    setNewHabitName('');
    setNewHabitCategory('Uncategorized');
    setShowAddHabit(false);
  };

  const toggleDay = async (habitId, date) => {
    const dateStr = formatDate(date);
    // find habit and compute new completedDays
    const habit = habits.find(h => h._id === habitId);
    if (!habit) return;
    const completedDays = { ...(habit.completedDays || {}) };
    if (completedDays[dateStr]) delete completedDays[dateStr]; else completedDays[dateStr] = true;

    try {
      await updateHabitRemote(habitId, { completedDays });
      // apply update locally only after server success
      setHabits(prev => prev.map(h => h._id === habitId ? { ...h, completedDays } : h));
    } catch (e) {
      console.error('Failed to update habit on server', e);
      alert('Failed to update habit on server. Please try again.');
    }
  };

  const deleteHabit = async (habitId) => {
    try {
      const res = await deleteHabitRemote(habitId);
      if (res && res.deletedCount) {
        setHabits(habits.filter(h => h._id !== habitId));
      } else {
        alert('Failed to delete habit on server.');
      }
    } catch (e) {
      console.error('Failed to delete habit', e);
      alert('Failed to delete habit on server.');
    }
  };

  const calculateProgress = (habit, dates) => {
    const total = dates.length;
    let completed = 0;
    dates.forEach(date => {
      const dateStr = formatDate(date);
      if (habit.completedDays && habit.completedDays[dateStr]) {
        completed++;
      }
    });
    return {
      completed,
      total,
      percentage: total > 0 ? ((completed / total) * 100).toFixed(0) : 0
    };
  };

  const getDailyProgress = (date) => {
    if (habits.length === 0) return 0;
    let totalCompleted = 0;
    habits.forEach(habit => {
      const dateStr = formatDate(date);
      if (habit.completedDays && habit.completedDays[dateStr]) {
        totalCompleted++;
      }
    });
    return Math.round((totalCompleted / habits.length) * 100);
  };

  const calculateStreaks = () => {
    if (habits.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }

    const today = new Date();
    const allDates = [];
    const start = new Date(2026, 0, 1);
    const end = new Date(Math.min(today.getTime(), new Date(2026, 11, 31).getTime()));
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDates.push(new Date(d));
    }

    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    for (let i = allDates.length - 1; i >= 0; i--) {
      const progress = getDailyProgress(allDates[i]);
      if (progress > 0) {
        tempStreak++;
        if (i === allDates.length - 1) {
          current = tempStreak;
        }
      } else {
        if (current === 0 && tempStreak > 0) {
          tempStreak = 0;
        } else {
          longest = Math.max(longest, tempStreak);
          tempStreak = 0;
        }
      }
      longest = Math.max(longest, tempStreak);
    }

    setCurrentStreak(current);
    setLongestStreak(Math.max(longest, current));
  };

  // Format streak number for display (cap large numbers)
  const formatStreak = (n) => {
    if (typeof n !== 'number') return '0';
    if (n > 99) return '99+';
    return String(n);
  };

  const getIntensityColor = (percentage) => {
    if (percentage === 0) return 'bg-gray-100';
    if (percentage <= 25) return 'bg-green-200';
    if (percentage <= 50) return 'bg-green-400';
    if (percentage <= 75) return 'bg-green-600';
    return 'bg-green-800';
  };

  const getYearWeeks = () => {
    const weeks = [];
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);
    
    const firstDay = new Date(start);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());
    
    let currentWeek = [];
    const currentDate = new Date(firstDay);
    
    while (currentDate <= end || currentWeek.length > 0) {
      if (currentDate.getDay() === 0 && currentWeek.length > 0) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      
      currentWeek.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
      
      if (currentDate > end && currentWeek.length > 0) {
        weeks.push([...currentWeek]);
        break;
      }
    }
    
    return weeks;
  };

  const getDatesToShow = () => {
    if (viewMode === 'week') return getWeekDates(currentWeek);
    if (viewMode === 'month') return getMonthDates(currentMonth);
    return getAllDates();
  };

  const getViewTitle = () => {
    if (viewMode === 'week') {
      const dates = getWeekDates(currentWeek);
      const start = dates[0];
      const end = dates[6];
      return `Week ${currentWeek + 1} (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    }
    if (viewMode === 'month') {
      return months[currentMonth];
    }
    return '2026 Full Year';
  };

  const canNavigatePrev = () => {
    if (viewMode === 'week') return currentWeek > 0;
    if (viewMode === 'month') return currentMonth > 0;
    return false;
  };

  const canNavigateNext = () => {
    if (viewMode === 'week') return currentWeek < 51;
    if (viewMode === 'month') return currentMonth < 11;
    return false;
  };

  const navigatePrev = () => {
    if (viewMode === 'week') setCurrentWeek(Math.max(0, currentWeek - 1));
    if (viewMode === 'month') setCurrentMonth(Math.max(0, currentMonth - 1));
  };

  const navigateNext = () => {
    if (viewMode === 'week') setCurrentWeek(Math.min(51, currentWeek + 1));
    if (viewMode === 'month') setCurrentMonth(Math.min(11, currentMonth + 1));
  };

  const dates = getDatesToShow();

  const openNoteModal = (date) => {
    setSelectedDate(date);
    const dateStr = formatDate(date);
    setCurrentNote(dailyNotes[dateStr] || '');
    setShowNoteModal(true);
  };

  const saveNote = () => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate);
      const newNotes = { ...dailyNotes, [dateStr]: currentNote };
      // save to server first
      saveNotesRemote(newNotes).then(() => {
        setDailyNotes(newNotes);
        setShowNoteModal(false);
        setSelectedDate(null);
        setCurrentNote('');
      }).catch(e => {
        console.error('Failed to save notes remotely', e);
        alert('Failed to save notes on server.');
      });
    }
  };

  const groupedHabits = habits.reduce((acc, habit) => {
    const category = habit.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(habit);
    return acc;
  }, {});


function getMonthSpans(weeks, year) {
  const months = [];

  weeks.forEach((week, index) => {
    // Find a day in this week that belongs to the target year
    const dayInYear = week.find(d => d.getFullYear() === year);
    if (!dayInYear) return;

    const label = dayInYear.toLocaleString('en-US', { month: 'short' });

    if (!months.length || months[months.length - 1].label !== label) {
      months.push({
        label,
        start: index,
        span: 1,
      });
    } else {
      months[months.length - 1].span += 1;
    }
  });

  return months;
}


  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Minimal top navbar */}
        <nav className="bg-white rounded-xl shadow-sm px-4 py-2 mb-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* compact 2026 logo (split colors) */}
              <svg width="72" height="28" viewBox="0 0 160 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <defs>
                  <linearGradient id="g20_nav" x1="0" x2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="g26_nav" x1="0" x2="1">
                    <stop offset="0%" stopColor="#16a34a" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <text x="0" y="20" fontFamily="Inter, system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="20">
                  <tspan fill="url(#g20_nav)">20</tspan>
                  <tspan fill="url(#g26_nav)">26</tspan>
                </text>
              </svg>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 mr-1">
                {/* streak badge (compact) */}
                <div className="relative w-9 h-9 flex items-center justify-center" title={`${currentStreak} day streak`} aria-label={`${currentStreak} day streak`}> 
                  <svg className="w-9 h-9" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden>
                    <defs>
                      <linearGradient id="streakGrad_nav" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ffd6d6" />
                        <stop offset="50%" stopColor="#ff9a9a" />
                        <stop offset="100%" stopColor="#ff4b4b" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="34" r="18" fill="#fff" stroke="#f3f4f6" strokeWidth="1" />
                    <g transform="translate(0,-6)">
                      <path d="M32 6c5 6 6 11 6 15 0 7-5 10-6 15-1-5-6-8-6-15 0-4 1-9 6-15z" fill="url(#streakGrad_nav)" />
                    </g>
                    <text x="32" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="#dc2626" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{formatStreak(currentStreak)}</text>
                  </svg>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-800"
                  title={user || 'Account'}
                >
                  {user ? user.charAt(0).toUpperCase() : 'U'}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
                    <button onClick={() => { setViewMode('month'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Monthly</button>
                    <button onClick={() => { setViewMode('year'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Yearly</button>
                    <button onClick={() => { setViewMode('dashboard'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Dashboard</button>
                    <button onClick={() => { setViewMode('account'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Account</button>
                    <button onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50">Logout</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Toolbar with view title and Add button */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">{viewMode === 'dashboard' ? 'Dashboard' : getViewTitle()}</h2>
          </div>

          <div>
            {showAddHabit ? (
              <div className="space-y-2 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                    placeholder="Habit name..."
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={addHabit} className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm">Add</button>
                  <button onClick={() => { setShowAddHabit(false); setNewHabitName(''); setNewHabitCategory('Uncategorized'); }} className="px-3 py-1 rounded-lg bg-gray-100 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddHabit(true)}
                className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                title="Add habit"
                aria-label="Add habit"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : viewMode === 'dashboard' ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Overview</h3>
              <p className="text-sm text-gray-500">Quick stats for {user}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded">
                <div className="text-xs text-gray-600">Total habits</div>
                <div className="text-2xl font-bold text-gray-800">{habits.length}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-xs text-gray-600">Current streak</div>
                <div className="text-2xl font-bold text-gray-800">{currentStreak}</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-xs text-gray-600">Longest streak</div>
                <div className="text-2xl font-bold text-gray-800">{longestStreak}</div>
              </div>
            </div>
          </div>
        ) : viewMode === 'account' ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Account</h3>
            <p className="text-sm text-gray-600 mb-4">Signed in as <span className="font-medium text-gray-800">{user}</span></p>
            <div className="flex gap-2">
              <button onClick={() => setViewMode('dashboard')} className="px-4 py-2 bg-gray-100 rounded">Back to Dashboard</button>
              <button onClick={() => { onLogout && onLogout(); }} className="px-4 py-2 bg-red-600 text-white rounded">Logout</button>
            </div>
          </div>
        ) : habits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Habits Yet</h3>
            <p className="text-gray-500">Click "Add New Habit" to start tracking</p>
          </div>
        ) : viewMode === 'year' ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {habits.reduce((sum, habit) => {
                  return sum + Object.keys(habit.completedDays || {}).length;
                }, 0)} completions in 2026
              </h3>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
                </div>
                <span>More</span>
              </div>
            </div>
            
       <div className="overflow-x-auto pb-4">
  <div
    className="inline-grid gap-1"
    style={{
      gridTemplateColumns: `repeat(${getYearWeeks().length}, min-content)`,
    }}
  >
    {/* Month labels */}
    {getMonthSpans(getYearWeeks(),2026).map((month, idx) => (
      <div
        key={idx}
        className="text-xs text-gray-500"
        style={{
          gridColumn: `${month.start + 1} / span ${month.span}`,
        }}
      >
        {month.label}
      </div>
    ))}

    {/* Contribution grid */}
    {getYearWeeks().map((week, weekIdx) => (
      <div key={weekIdx} className="flex flex-col gap-1">
        {week.map((date, dayIdx) => {
          const is2026 = date.getFullYear() === 2026;
          const progress = is2026 ? getDailyProgress(date) : 0;
          const isToday =
            date.toDateString() === new Date().toDateString();

          return (
            <div
              key={dayIdx}
              className={`w-3 h-3 rounded-sm
                ${is2026 ? getIntensityColor(progress) : 'bg-transparent'}
                ${isToday && is2026 ? 'ring-2 ring-blue-500' : ''}
                ${is2026 ? 'hover:ring-2 hover:ring-gray-400 cursor-pointer' : ''}
                transition-all`}
              title={
                is2026
                  ? `${date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}: ${progress}% completion`
                  : ''
              }
              onClick={() => {
                if (is2026) {
                  const dateStr = formatDate(date);
                  setSelectedDate(date);
                  setCurrentNote(dailyNotes[dateStr] || '');
                  setShowNoteModal(true);
                }
              }}
            />
          );
        })}
      </div>
    ))}
  </div>
</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 sm:px-3 sm:py-2 text-left font-semibold text-gray-700 min-w-[140px] text-xs">HABITS</th>
                    <th className="px-1 py-1 sm:px-2 sm:py-2 text-center font-semibold text-gray-700 w-12 text-xs">GOAL</th>
                    {dates.map((date, idx) => (
                      <th key={idx} className="px-1 py-1 sm:px-1 sm:py-2 text-center font-semibold text-gray-700 min-w-[44px]">
                        <button
                          onClick={() => openNoteModal(date)}
                          className="hover:bg-green-200 rounded px-1 py-0.5 transition-colors w-full"
                        >
                          <div className="text-xs">{daysOfWeek[date.getDay()]}</div>
                          <div className="text-xs font-bold">{date.getDate()}</div>
                          {dailyNotes[formatDate(date)] && (
                            <div className="text-xs text-green-600">📝</div>
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs">PROGRESS</th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 w-12 text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedHabits).map(([category, categoryHabits]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-gray-50">
                        <td colSpan={dates.length + 4} className="px-3 py-2 text-xs font-bold text-gray-600 uppercase">
                          {category}
                        </td>
                      </tr>
                      {categoryHabits.map(habit => {
                        const progress = calculateProgress(habit, dates);
                        return (
                          <tr key={habit._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-2 py-2 sm:px-3 sm:py-3">
                              <div className="font-medium text-sm sm:text-base text-gray-800">{habit.name}</div>
                            </td>
                            <td className="px-1 py-2 sm:px-2 sm:py-3 text-center text-gray-600">{habit.goal}</td>
                            {dates.map((date, idx) => {
                              const dateStr = formatDate(date);
                              const isCompleted = habit.completedDays && habit.completedDays[dateStr];
                              const isToday = date.toDateString() === new Date().toDateString();
                              
                              return (
                                <td key={idx} className="px-1 py-1 sm:py-3 text-center">
                                  <button
                                    onClick={() => toggleDay(habit._id, date)}
                                    aria-pressed={isCompleted}
                                    className={`flex items-center justify-center transition-all transform ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                    title={dateStr}
                                  >
                                    {/* Outer bubble */}
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-150 ${
                                      isCompleted
                                        ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-md'
                                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                                    }`}>
                                      {/* Checkmark that appears when completed (nicer bubble) */}
                                      <svg
                                        viewBox="0 0 24 24"
                                        className={`w-3 h-3 text-white transition-all duration-150 transform ${isCompleted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                                        aria-hidden
                                      >
                                        <path fill="currentColor" d="M9.2 16.2L4.8 11.8a1 1 0 10-1.4 1.4l5 5a1 1 0 001.4 0l11-11a1 1 0 10-1.4-1.4L9.2 16.2z" />
                                      </svg>
                                    </div>
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-2 py-2 sm:py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1 sm:h-2 min-w-[60px]">
                                  <div 
                                    className="bg-green-600 h-1 sm:h-2 rounded-full transition-all" 
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 whitespace-nowrap">
                                  {progress.completed}/{progress.total}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 sm:py-3 text-center">
                              <button
                                onClick={() => deleteHabit(habit._id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete habit"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Note Modal */}
      {showNoteModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Notes for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Add your daily notes here..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={saveNote}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setSelectedDate(null);
                  setCurrentNote('');
                }}
                className="flex-1 bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitTracker2026;