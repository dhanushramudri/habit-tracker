import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const HabitTracker2026 = ({ user, onLogout }) => {
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Uncategorized');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [viewMode, setViewMode] = useState('week');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyNotes, setDailyNotes] = useState({});
  const [currentNote, setCurrentNote] = useState('');
  const editorRef = useRef(null);
  const quillEditorRef = useRef(null);
  const quillInstanceRef = useRef(null);
  const [quillAvailable, setQuillAvailable] = useState(false);
  // Theme: 'bw' = black & white (default), 'dark' = dark theme
  const [theme, setTheme] = useState('bw');

  // Derived classes for theming (keeps changes minimal across the file)
  // Light theme = 'bw', Dark theme = 'dark'
  const accentBg = theme === 'bw' ? 'bg-black' : 'bg-gray-700';
  const accentText = theme === 'bw' ? 'text-white' : 'text-white';
  const accentHover = theme === 'bw' ? 'hover:bg-gray-800' : 'hover:bg-gray-600';
  const focusRing = theme === 'bw' ? 'focus:ring-black' : 'focus:ring-gray-300';
  const subtleBg = theme === 'bw' ? 'bg-gray-50' : 'bg-gray-800';
  const tableHeadBg = theme === 'bw' ? 'bg-gray-100' : 'bg-gray-700';
  const noteIconColor = theme === 'bw' ? 'text-black' : 'text-white';
  const accentBorder = theme === 'bw' ? 'border-black' : 'border-gray-600';
  const ringToday = theme === 'bw' ? 'ring-2 ring-black' : 'ring-2 ring-indigo-400';
  const hoverBg = theme === 'bw' ? 'hover:bg-gray-100' : 'hover:bg-gray-700';
  const [categories, setCategories] = useState(['Health', 'Study', 'Work', 'Personal', 'Fitness', 'Uncategorized']);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  // Frontend will use backend API routes at /api (no client-side DB creds)
  const backendBase = 'https://habit-tracker-backend-ten.vercel.app/api';
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
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

    // load notes (and categories if present)
    fetch(`${backendBase}/notes?username=${encodeURIComponent(user)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch notes');
        return r.json();
      })
      .then(result => {
        const doc = result && result.document ? result.document : null;
        setDailyNotes(doc ? (doc.notes || {}) : {});
        if (doc && doc.categories) {
          setCategories(Array.isArray(doc.categories) && doc.categories.length ? doc.categories : categories);
        }
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

  const saveCategoriesRemote = async (cats) => {
    const res = await fetch(`${backendBase}/notes`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, categories: cats })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => 'save categories failed');
      throw new Error(txt || 'Failed to save categories');
    }
    return await res.json();
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

  const addCategory = async () => {
    const name = (newCategoryName || '').trim();
    if (!name) return;
    if (categories.includes(name)) {
      alert('Category already exists');
      return;
    }
    const next = [...categories, name];
    try {
      await saveCategoriesRemote(next);
      setCategories(next);
      setNewCategoryName('');
    } catch (e) {
      console.error('Failed to save categories', e);
      alert('Failed to save category on server.');
    }
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

  // Quick helpers for board view interactions
  const todayStr = () => formatDate(new Date());

  const toggleTodayForHabit = async (habitId) => {
    const dateStr = todayStr();
    const habit = habits.find(h => h._id === habitId);
    if (!habit) return;
    const completedDays = { ...(habit.completedDays || {}) };
    if (completedDays[dateStr]) delete completedDays[dateStr]; else completedDays[dateStr] = true;
    try {
      await updateHabitRemote(habitId, { completedDays });
      setHabits(prev => prev.map(h => h._id === habitId ? { ...h, completedDays } : h));
    } catch (e) {
      console.error('Failed toggling today for habit', e);
      alert('Failed to update habit on server.');
    }
  };

  const moveHabitToCategory = async (habitId, newCategory) => {
    const habit = habits.find(h => h._id === habitId);
    if (!habit) return;
    const updates = { ...habit, category: newCategory };
    try {
      await updateHabitRemote(habitId, { category: newCategory });
      setHabits(prev => prev.map(h => h._id === habitId ? { ...h, category: newCategory } : h));
    } catch (e) {
      console.error('Failed to move habit', e);
      alert('Failed to move habit on server.');
    }
  };

  const addCardInCategory = async (category) => {
    const name = window.prompt('New habit name');
    if (!name || !name.trim()) return;
    const newHabit = {
      year: 2026,
      name: name.trim(),
      category,
      goal: 30,
      completedDays: {},
      createdAt: new Date().toISOString()
    };
    if (user) newHabit.username = user;
    try {
      const id = await createHabitRemote(newHabit);
      newHabit._id = id;
      setHabits(prev => [...prev, newHabit]);
    } catch (e) {
      console.error('Failed to create habit on server', e);
      alert('Failed to create habit.');
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
    // If no habits, reset streaks
    if (habits.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }

    const today = new Date();
    // Determine earliest relevant date from existing habit data (completedDays or createdAt)
    let earliest = null;
    habits.forEach(h => {
      if (h.createdAt) {
        const c = new Date(h.createdAt);
        if (!isNaN(c)) earliest = !earliest || c < earliest ? c : earliest;
      }
      const keys = Object.keys(h.completedDays || {});
      keys.forEach(k => {
        const d = new Date(k);
        if (!isNaN(d)) earliest = !earliest || d < earliest ? d : earliest;
      });
    });
    const defaultStart = new Date(2026, 0, 1);
    const start = earliest ? new Date(Math.min(earliest.getTime(), defaultStart.getTime())) : defaultStart;
    const end = new Date(Math.min(today.getTime(), new Date(2026, 11, 31).getTime()));

    // Build array of boolean: true if any habit completed that day
    const dayFlags = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      const progress = getDailyProgress(date);
      dayFlags.push(progress > 0);
    }

    // Current streak: count consecutive true values from the end
    let current = 0;
    for (let i = dayFlags.length - 1; i >= 0; i--) {
      if (dayFlags[i]) current++; else break;
    }

    // Longest streak: find max run of consecutive true
    let longest = 0;
    let run = 0;
    for (let i = 0; i < dayFlags.length; i++) {
      if (dayFlags[i]) {
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }

    setCurrentStreak(current);
    setLongestStreak(longest);
  };

  const getIntensityColor = (percentage) => {
    if (percentage === 0) return theme === 'bw' ? 'bg-gray-100' : 'bg-transparent';
    if (percentage <= 25) return theme === 'bw' ? 'bg-gray-200' : 'bg-gray-700';
    if (percentage <= 50) return theme === 'bw' ? 'bg-gray-400' : 'bg-gray-600';
    if (percentage <= 75) return theme === 'bw' ? 'bg-gray-600' : 'bg-gray-500';
    return theme === 'bw' ? 'bg-gray-800' : 'bg-white';
  };

  // Green intensity helper specifically for the yearly heatmap (use green shades like before)
  const getGreenIntensityColor = (percentage) => {
    if (percentage === 0) return 'bg-gray-100';
    if (percentage <= 25) return 'bg-green-100';
    if (percentage <= 50) return 'bg-green-300';
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
      let contentHtml = currentNote || '';
      if (quillInstanceRef.current && quillInstanceRef.current.root) {
        contentHtml = quillInstanceRef.current.root.innerHTML || '';
      } else if (editorRef.current) {
        contentHtml = editorRef.current.innerHTML || contentHtml;
      }
      const newNotes = { ...dailyNotes, [dateStr]: contentHtml };
      // save to server first
      saveNotesRemote(newNotes).then(() => {
        setDailyNotes(newNotes);
        setShowNoteModal(false);
        setSelectedDate(null);
        setCurrentNote('');
        if (editorRef.current) editorRef.current.innerHTML = '';
        if (quillInstanceRef.current && quillInstanceRef.current.root) quillInstanceRef.current.root.innerHTML = '';
      }).catch(e => {
        console.error('Failed to save notes remotely', e);
        alert('Failed to save notes on server.');
      });
    }
  };

  useEffect(() => {
    // when opening the modal, populate the editor with currentNote (which may be plain text or HTML)
    if (showNoteModal) {
      // If Quill is available, initialize it into quillEditorRef and set content
      if (quillAvailable && quillEditorRef.current && window.Quill) {
        try {
          if (!quillInstanceRef.current) {
            quillInstanceRef.current = new window.Quill(quillEditorRef.current, {
              theme: 'snow',
              modules: { toolbar: [['bold','italic','underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['link']] }
            });
          }
          quillInstanceRef.current.root.innerHTML = currentNote || '';
        } catch (e) {
          console.warn('Quill init failed, falling back to editable div', e);
          if (editorRef.current) editorRef.current.innerHTML = currentNote || '';
        }
      } else {
        if (editorRef.current) editorRef.current.innerHTML = currentNote || '';
      }
    } else {
      // modal closed: clean up quill instance reference (Quill has no destroy API here)
      if (quillInstanceRef.current) {
        quillInstanceRef.current = null;
      }
    }
  }, [showNoteModal, currentNote, quillAvailable]);

  useEffect(() => {
    // load Quill JS/CSS dynamically when the note modal opens so we avoid installing
    // a React wrapper and keep compatibility with React 19.
    let mounted = true;
    const loadQuillFromCdn = () => {
      if (!showNoteModal) return;
      // if already available, initialize
      if (window.Quill) {
        setQuillAvailable(true);
        return;
      }

      // inject CSS
      if (!document.querySelector('#quill-snow-css')) {
        const link = document.createElement('link');
        link.id = 'quill-snow-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
        document.head.appendChild(link);
      }

      // load script
      if (!document.querySelector('#quill-js')) {
        const script = document.createElement('script');
        script.id = 'quill-js';
        script.src = 'https://cdn.quilljs.com/1.3.6/quill.js';
        script.onload = () => {
          if (mounted) setQuillAvailable(true);
        };
        script.onerror = () => {
          console.warn('Failed to load Quill from CDN');
        };
        document.body.appendChild(script);
      }
    };
    loadQuillFromCdn();
    return () => { mounted = false; };
  }, [showNoteModal]);

  const applyFormat = (cmd, value = null) => {
    try {
      document.execCommand(cmd, false, value);
      // update currentNote from editor
      if (editorRef.current) setCurrentNote(editorRef.current.innerHTML);
    } catch (e) {
      console.warn('Formatting failed', e);
    }
  };

  const groupedHabits = habits.reduce((acc, habit) => {
    const category = habit.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(habit);
    return acc;
  }, {});

  // Dashboard stats helpers
  const computeDashboardStats = () => {
    const totalHabits = habits.length;
    const totalCompletions = habits.reduce((sum, h) => sum + Object.keys(h.completedDays || {}).length, 0);
    const habitsWithNoCompletion = habits.filter(h => Object.keys(h.completedDays || {}).length === 0).length;
    const topHabit = habits.slice().sort((a, b) => (Object.keys(b.completedDays || {}).length) - (Object.keys(a.completedDays || {}).length))[0];
    const notesCount = Object.keys(dailyNotes || {}).length;

    // average daily completion percent across days in 2026 up to today
    let avgDailyPercent = 0;
    if (totalHabits > 0) {
      const today = new Date();
      const start = new Date(2026, 0, 1);
      const end = new Date(Math.min(today.getTime(), new Date(2026, 11, 31).getTime()));
      const days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
      const dailyPercents = days.map(day => {
        const ds = formatDate(day);
        const completed = habits.reduce((s, h) => s + (h.completedDays && h.completedDays[ds] ? 1 : 0), 0);
        return totalHabits === 0 ? 0 : (completed / totalHabits) * 100;
      });
      avgDailyPercent = dailyPercents.length ? (dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length) : 0;
    }

    return {
      totalHabits,
      totalCompletions,
      habitsWithNoCompletion,
      topHabitName: topHabit ? topHabit.name : null,
      topHabitCompletions: topHabit ? Object.keys(topHabit.completedDays || {}).length : 0,
      notesCount,
      avgDailyPercent: Math.round(avgDailyPercent),
      currentStreak,
      longestStreak
    };
  };

  // Chart helpers
  const computeTopHabits = (limit = 5) => {
    const counts = habits.map(h => ({ name: h.name, count: Object.keys(h.completedDays || {}).length }));
    counts.sort((a, b) => b.count - a.count);
    return counts.slice(0, limit);
  };

  const computeWeeklyTrend = () => {
    // last 7 days including today
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(new Date(d));
    }
    const totals = days.map(day => {
      const ds = formatDate(day);
      const completed = habits.reduce((s, h) => s + (h.completedDays && h.completedDays[ds] ? 1 : 0), 0);
      const pct = habits.length === 0 ? 0 : Math.round((completed / habits.length) * 100);
      return { date: ds, value: pct };
    });
    return totals;
  };

  // Small presentational charts using SVG (no deps)
  const SimpleBarChart = ({ items }) => {
    const width = 300; const height = 120; const padding = 8;
    const max = Math.max(...items.map(i => i.count), 1);
    const barWidth = Math.max(20, (width - padding * 2) / Math.max(items.length, 1) - 8);
    return (
      <svg width={width} height={height} className="block mx-auto">
        {items.map((it, idx) => {
          const x = padding + idx * (barWidth + 8);
          const h = Math.round((it.count / max) * (height - 40));
          return (
            <g key={it.name}>
              <rect x={x} y={height - h - 24} width={barWidth} height={h} fill="#16a34a" rx="4" />
              <text x={x + barWidth/2} y={height - 6} fontSize="10" textAnchor="middle" fill="#374151">{it.name.length>10?it.name.slice(0,10)+"…":it.name}</text>
              <text x={x + barWidth/2} y={height - h - 28} fontSize="11" textAnchor="middle" fill="#065f46">{it.count}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const Sparkline = ({ data }) => {
    const w = 300; const h = 60; const pad = 6;
    if (!data || data.length === 0) return <div className="text-sm text-gray-500">No data</div>;
    const values = data.map(d => d.value);
    const max = Math.max(...values, 1);
    const step = (w - pad * 2) / (values.length - 1 || 1);
    const points = values.map((v, i) => `${pad + i * step},${h - pad - (v / max) * (h - pad * 2)}`).join(' ');
    const last = values[values.length - 1];
    return (
      <svg width={w} height={h} className="block mx-auto">
        <polyline points={points} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => {
          const x = pad + i * step;
          const y = h - pad - (v / max) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r={2.5} fill="#16a34a" />;
        })}
        <text x={w - pad} y={12} fontSize="11" textAnchor="end" fill="#065f46">{last}%</text>
      </svg>
    );
  };


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
    <div className={`min-h-screen p-4 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      <div className="max-w-7xl mx-auto">
        {/* compact upper card: smaller padding/gaps on mobile */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-xl shadow-sm p-2 sm:p-6 mb-3`}>
          <div className="flex items-center justify-between flex-wrap gap-1 mb-1 sm:mb-4">
            {/* Compact navbar */}
            <nav className="flex items-center justify-between w-full mb-2 sm:mb-4">
              <a href="/" aria-label="Go to homepage" className="flex items-center gap-3 cursor-pointer no-underline">
                <div className={`text-base sm:text-2xl font-extrabold ${theme === 'bw' ? 'text-black' : 'text-white'}`}>2026</div>
                {/* <div className={`text-[10px] sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Habit Tracker</div> */}
              </a>

              <div className="relative flex items-center">
                {/* Add habit button moved into navbar (compact on mobile) */}
                {showAddHabit ? (
                  <button
                    onClick={() => setShowAddHabit(false)}
                    title="Close add"
                    className={`mr-2 p-1 sm:p-2 rounded-full w-8 h-8 sm:w-10 sm:h-10 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'} flex items-center justify-center`}
                  >
                    ×
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAddHabit(true)}
                    title="Add habit"
                    className={`mr-2 p-1 sm:p-2 rounded-full w-8 h-8 sm:w-10 sm:h-10 ${accentBg} ${accentText} ${accentHover} flex items-center justify-center`}
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}

                <button
                  onClick={() => setShowProfileMenu(s => !s)}
                  className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full ${accentBg} ${accentText} flex items-center justify-center font-semibold`}
                  title={user || 'Account'}
                >
                  {user ? user[0].toUpperCase() : '?'}
                  {/* streak badge inside profile button */}
                  <span className={`absolute -top-2 -right-2 sm:-top-2 sm:-right-2 flex items-center gap-1 text-[10px] font-semibold rounded-full px-1 py-0.5 ${theme === 'dark' ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-black border border-gray-200'}`}>
                    <span className="text-xs">🔥</span>
                    <span className="leading-none">{currentStreak}</span>
                  </span>
                </button>

                {showProfileMenu && (
                  <div className={`absolute right-0 top-12 w-48 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-lg py-1 z-50`}>
                    <button onClick={() => { setViewMode('week'); setShowProfileMenu(false); }} className={`w-full text-left px-4 py-2 ${hoverBg} whitespace-nowrap`}>Weekly</button>
                    <button onClick={() => { setViewMode('month'); setShowProfileMenu(false); }} className={`w-full text-left px-4 py-2 ${hoverBg} whitespace-nowrap`}>Monthly</button>
                    <button onClick={() => { setViewMode('year'); setShowProfileMenu(false); }} className={`w-full text-left px-4 py-2 ${hoverBg} whitespace-nowrap`}>Yearly</button>
                    <button onClick={() => { setViewMode('dashboard'); setShowProfileMenu(false); }} className={`w-full text-left px-4 py-2 ${hoverBg} whitespace-nowrap`}>Dashboard</button>
                    <button onClick={() => { setViewMode('board'); setShowProfileMenu(false); }} className={`w-full text-left px-4 py-2 ${hoverBg} whitespace-nowrap`}>Board</button>
                    <button onClick={() => { setShowAccount(true); setShowProfileMenu(false); }} className={`w-full text-left px-4 py-2 ${hoverBg} whitespace-nowrap`}>Account</button>
                    <button onClick={() => { setTheme(t => t === 'bw' ? 'dark' : 'bw'); setShowProfileMenu(false); }} className={`w-full text-left px-4 py-2 ${hoverBg} whitespace-nowrap`}>Theme: {theme === 'bw' ? 'B/W' : 'Dark'}</button>
                    <button onClick={() => { setShowProfileMenu(false); onLogout && onLogout(); }} className={`w-full text-left px-4 py-2 ${theme === 'bw' ? 'text-red-600' : 'text-red-400'} ${hoverBg} whitespace-nowrap`}>Logout</button>
                  </div>
                )}
              </div>
            </nav>

            {showAccount && (
              <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow p-4 mb-4 max-w-sm`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`${theme === 'dark' ? 'text-gray-300 text-sm' : 'text-sm text-gray-500'}`}>Account</div>
                    <div className={`${theme === 'dark' ? 'font-medium text-gray-100' : 'font-medium text-gray-800'}`}>{user || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAccount(false)} className="px-3 py-1 text-sm bg-gray-100 rounded">Close</button>
                    <button onClick={() => { onLogout && onLogout(); }} className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded">Logout</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View controls moved to profile menu. */}

            <div className="flex items-center justify-between mb-2 sm:mb-4">
            <button
              onClick={navigatePrev}
              disabled={!canNavigatePrev()}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className={`text-base sm:text-xl font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{getViewTitle()}</h2>
            <button
              onClick={navigateNext}
              disabled={!canNavigateNext()}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          

          {(viewMode !== 'dashboard' && viewMode !== 'year' && viewMode !== 'board') && (showAddHabit ? (
            <div className="space-y-2">
              <div className="flex gap-2 items-start">
                <select
                  value={newHabitCategory}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '__custom__') {
                      setShowAddCategoryInput(true);
                      setNewHabitCategory('Uncategorized');
                    } else {
                      setNewHabitCategory(v);
                    }
                  }}
                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing} focus:border-transparent text-sm`}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">Create custom category...</option>
                </select>

                {showAddCategoryInput && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button onClick={addCategory} className={`${accentBg} ${accentText} px-3 py-2 rounded-lg text-sm ${accentHover}`}>Add</button>
                    <button onClick={() => { setShowAddCategoryInput(false); setNewCategoryName(''); }} className="bg-gray-200 px-3 py-2 rounded-lg text-sm">Cancel</button>
                  </div>
                )}
              </div>
                <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                placeholder="Habit name..."
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing} focus:border-transparent text-sm`}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={addHabit}
                  className={`flex-1 ${accentBg} ${accentText} px-4 py-2 rounded-lg ${accentHover} transition-colors text-sm font-medium`}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddHabit(false);
                    setNewHabitName('');
                    setNewHabitCategory('Uncategorized');
                  }}
                  className="flex-1 bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null)}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${accentBorder}`}></div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className={`${subtleBg} rounded-xl shadow-sm p-12 text-center ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}>
            <Calendar className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>No Habits Yet</h3>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Click "Add New Habit" to start tracking</p>
          </div>
  ) : viewMode === 'dashboard' ? (
          <div className={`${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-black'} rounded-xl shadow-sm p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Dashboard</h3>
            {(() => {
              const s = computeDashboardStats();
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-sm text-gray-500'}`}>Total habits</div>
                    <div className={`${theme === 'dark' ? 'text-white text-2xl' : 'text-2xl font-bold text-gray-800'}`}>{s.totalHabits}</div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Total completions (2026)</div>
                    <div className="text-2xl font-bold text-gray-800">{s.totalCompletions}</div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Avg daily completion</div>
                    <div className="text-2xl font-bold text-gray-800">{s.avgDailyPercent}%</div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Habits with no completions</div>
                    <div className="text-2xl font-bold text-gray-800">{s.habitsWithNoCompletion}</div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Top habit</div>
                    <div className="text-lg font-semibold text-gray-800">{s.topHabitName || '—'}</div>
                    <div className="text-sm text-gray-500">{s.topHabitCompletions} completions</div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Notes saved</div>
                    <div className="text-2xl font-bold text-gray-800">{s.notesCount}</div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Current streak</div>
                    <div className="text-2xl font-bold text-gray-800">{s.currentStreak}</div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Longest streak</div>
                    <div className="text-2xl font-bold text-gray-800">{s.longestStreak}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : viewMode === 'year' ? (
          <div className="bg-white rounded-xl shadow-sm p-6 flex justify-center">
            {/* Year heatmap only (no extra stats or charts) */}
            <div className="overflow-x-auto pb-4">
              <div
                className="inline-grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${getYearWeeks().length}, min-content)`,
                }}
              >
                {/* Month labels */}
                {getMonthSpans(getYearWeeks(), 2026).map((month, idx) => (
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

                {/* Contribution grid (green heatmap) */}
                {getYearWeeks().map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {week.map((date, dayIdx) => {
                      const is2026 = date.getFullYear() === 2026;
                      const progress = is2026 ? getDailyProgress(date) : 0;
                      const isToday = date.toDateString() === new Date().toDateString();

                      return (
                        <div
                          key={dayIdx}
                          className={`w-3 h-3 rounded-sm
                            ${is2026 ? getGreenIntensityColor(progress) : 'bg-transparent'}
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
        ) : viewMode === 'board' ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm overflow-hidden p-3`}> 
            <h3 className={`text-base font-semibold mb-3 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Board view</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-4 items-start pb-4">
                {categories.map(cat => {
                  const catHabits = groupedHabits[cat] || [];
                  const isCollapsed = !!collapsedCategories[cat];
                  return (
                  <div key={cat} className={`${theme === 'dark' ? 'min-w-[220px] bg-gray-800' : 'min-w-[220px] bg-gray-50'} rounded-lg p-3 shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`} title={isCollapsed ? 'Expand' : 'Collapse'}>
                          {isCollapsed ? '▸' : '▾'}
                        </button>
                        <div className={`${theme === 'dark' ? 'text-sm font-semibold text-gray-300' : 'text-sm font-semibold text-gray-700'}`}>{cat}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`${theme === 'dark' ? 'text-xs text-gray-400' : 'text-xs text-gray-500'}`}>{catHabits.length}</div>
                        <button onClick={() => addCardInCategory(cat)} className={`p-1 rounded-full ${accentBg} ${accentText} ${accentHover}`} title="Add card">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="space-y-2">
                        {catHabits.map(habit => {
                          const todayCompleted = habit.completedDays && habit.completedDays[todayStr()];
                          const progress = calculateProgress(habit, getWeekDates(currentWeek));
                          return (
                            <div key={habit._id} className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-md p-3 shadow-sm hover:shadow transition flex items-center justify-between gap-3 overflow-hidden min-h-[56px]`}> 
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button onClick={() => toggleTodayForHabit(habit._id)} className={`w-7 h-7 rounded-md flex items-center justify-center ${todayCompleted ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`} title="Toggle today">
                                  {todayCompleted ? '✓' : ''}
                                </button>
                                <div className="min-w-0">
                                  <div className={`${theme === 'dark' ? 'font-medium text-gray-100 text-sm truncate' : 'font-medium text-gray-800 text-sm truncate'}`}>{habit.name}</div>
                                  <div className={`${theme === 'dark' ? 'text-xs text-gray-400 mt-1' : 'text-xs text-gray-500 mt-1'}`}>{progress.completed}/{progress.total}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`${accentBg} h-2 rounded-full`} style={{ width: `${progress.percentage}%` }} />
                                </div>
                                <button onClick={() => moveHabitToCategory(habit._id, habit.category)} className="text-xs text-gray-400" title="Category">{habit.category}</button>
                                <button onClick={() => deleteHabit(habit._id)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!isCollapsed && (
                      <div className="mt-3">
                        <button onClick={() => addCardInCategory(cat)} className="w-full text-left text-sm px-3 py-2 rounded bg-white hover:bg-gray-100">+ Add card</button>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          </div>
    ) : (
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`${tableHeadBg} sticky top-0`}>
                  <tr>
            <th className={`px-2 py-1 text-left font-semibold min-w-[160px] text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>HABITS</th>
                        {dates.map((date, idx) => (
                      <th key={idx} className={`px-1 py-1 text-center font-semibold min-w-[44px] text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                        <button
                          onClick={() => openNoteModal(date)}
                          className={`rounded px-1 py-0.5 transition-colors w-full ${accentHover}`}
                        >
                          <div className="text-xs">{daysOfWeek[date.getDay()]}</div>
                          <div className="text-xs font-bold">{date.getDate()}</div>
                          {dailyNotes[formatDate(date)] && (
                            <div className={`text-xs ${noteIconColor}`}>📝</div>
                          )}
                        </button>
                      </th>
                    ))}
                    <th className={`px-2 py-2 text-center font-semibold text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>PROGRESS</th>
                    <th className={`px-2 py-2 text-center font-semibold w-12 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedHabits).map(([category, categoryHabits]) => (
                    <React.Fragment key={category}>
                      <tr className={`${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-700'} border-t`}>
                        <td
                          colSpan={dates.length + 3}
                          className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-center"
                        >
                          {category}
                        </td>
                      </tr>
                      {categoryHabits.map(habit => {
                        const progress = calculateProgress(habit, dates);
                        return (
                          <tr key={habit._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-2 py-2">
                              <div className={`font-medium ml-2 text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{habit.name}</div>
                            </td>
                            {dates.map((date, idx) => {
                              const dateStr = formatDate(date);
                              const isCompleted = habit.completedDays && habit.completedDays[dateStr];
                              const isToday = date.toDateString() === new Date().toDateString();
                              
                              return (
                                <td key={idx} className="px-1 py-2 text-center">
                                  <button
                                    onClick={() => toggleDay(habit._id, date)}
                                    className={`w-6 h-6 rounded-md transition-all ${
                                      isCompleted
                                        ? `${accentBg} ${accentHover} ${accentText}`
                                        : 'bg-gray-100 hover:bg-gray-200'
                                    } ${isToday ? ringToday : ''}`}
                                    title={dateStr}
                                  >
                                    {isCompleted && (
                                      <span className="text-white font-bold text-sm">✓</span>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[48px]">
                                  <div 
                                    className={`${accentBg} h-1.5 rounded-full transition-all ${accentText}`} 
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                                <span className={`text-xs whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {progress.completed}/{progress.total}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
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
        <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-xl shadow-xl max-w-2xl w-full p-6`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
              Notes for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <div className="space-y-2">
              {quillAvailable ? (
                <div>
                  <div ref={quillEditorRef} className="min-h-[300px] h-64" />
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => applyFormat('bold')} className="px-2 py-1 bg-gray-100 rounded">B</button>
                    <button type="button" onClick={() => applyFormat('italic')} className="px-2 py-1 bg-gray-100 rounded">I</button>
                    <button type="button" onClick={() => applyFormat('underline')} className="px-2 py-1 bg-gray-100 rounded">U</button>
                    <button type="button" onClick={() => applyFormat('insertUnorderedList')} className="px-2 py-1 bg-gray-100 rounded">• List</button>
                    <button type="button" onClick={() => applyFormat('insertOrderedList')} className="px-2 py-1 bg-gray-100 rounded">1. List</button>
                    <button type="button" onClick={() => {
                      const url = window.prompt('Enter URL (include https://)');
                      if (url) applyFormat('createLink', url);
                    }} className="px-2 py-1 bg-gray-100 rounded">Link</button>
                    <button type="button" onClick={() => { applyFormat('unlink'); }} className="px-2 py-1 bg-gray-100 rounded">Unlink</button>
                    <button type="button" onClick={() => { if (editorRef.current) { editorRef.current.innerHTML = ''; setCurrentNote(''); } }} className="px-2 py-1 bg-gray-100 rounded">Clear</button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={(e) => setCurrentNote(e.currentTarget.innerHTML)}
                    data-placeholder="Add your daily notes here..."
                    className={`editor w-full min-h-[300px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${focusRing} focus:border-transparent text-sm`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                  <div className="text-xs text-gray-500">Rich text editor — formatting is saved as HTML. (Fallback)</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={saveNote}
                className={`flex-1 ${accentBg} ${accentText} px-4 py-2 rounded-lg ${accentHover} transition-colors font-medium`}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setSelectedDate(null);
                  setCurrentNote('');
                }}
                className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} px-4 py-2 rounded-lg transition-colors font-medium`}
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