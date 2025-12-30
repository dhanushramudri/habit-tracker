import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const HabitTracker2026 = () => {
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Uncategorized');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week', 'month', 'year'
  const [currentWeek, setCurrentWeek] = useState(0); // Week number in 2026
  const [currentMonth, setCurrentMonth] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyNotes, setDailyNotes] = useState({});
  const [currentNote, setCurrentNote] = useState('');
  const [mongoConfig, setMongoConfig] = useState({
    apiKey: '',
    database: 'habitTracker',
    collection: 'habits2026'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(['Health', 'Study', 'Work', 'Personal', 'Fitness', 'Uncategorized']);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get current week number for 2026
  const getCurrentWeekNumber = () => {
    const now = new Date();
    const start2026 = new Date(2026, 0, 1);
    const diff = now - start2026;
    return Math.max(0, Math.min(51, Math.floor(diff / (7 * 24 * 60 * 60 * 1000))));
  };

  useEffect(() => {
    setCurrentWeek(getCurrentWeekNumber());
  }, []);

  // Get dates for a specific week
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

  // Get dates for a specific month
  const getMonthDates = (monthNum) => {
    const daysInMonth = new Date(2026, monthNum + 1, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(2026, monthNum, i));
    }
    return dates;
  };

  // Get all dates in 2026
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

  // MongoDB API calls
  const apiCall = async (endpoint, data) => {
    if (!mongoConfig.apiKey) return null;
    
    try {
      const response = await fetch(`https://data.mongodb-api.com/app/data-YOUR_APP_ID/endpoint/data/v1/action/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': mongoConfig.apiKey
        },
        body: JSON.stringify({
          dataSource: 'Cluster0',
          database: mongoConfig.database,
          collection: mongoConfig.collection,
          ...data
        })
      });
      return await response.json();
    } catch (error) {
      console.error('MongoDB API Error:', error);
      return null;
    }
  };

  const loadHabitsFromMongo = async () => {
    if (!mongoConfig.apiKey) return;
    
    setLoading(true);
    const result = await apiCall('find', {
      filter: { year: 2026 }
    });
    
    if (result && result.documents) {
      setHabits(result.documents);
      setIsConnected(true);
    }
    setLoading(false);
  };

  const saveHabitToMongo = async (habit) => {
    if (!mongoConfig.apiKey) return;
    const result = await apiCall('insertOne', { document: habit });
    return result;
  };

  const updateHabitInMongo = async (habitId, updates) => {
    if (!mongoConfig.apiKey) return;
    const result = await apiCall('updateOne', {
      filter: { _id: { $oid: habitId } },
      update: { $set: updates }
    });
    return result;
  };

  const deleteHabitFromMongo = async (habitId) => {
    if (!mongoConfig.apiKey) return;
    const result = await apiCall('deleteOne', {
      filter: { _id: { $oid: habitId } }
    });
    return result;
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

    if (mongoConfig.apiKey) {
      const result = await saveHabitToMongo(newHabit);
      if (result && result.insertedId) {
        newHabit._id = result.insertedId;
      }
    } else {
      newHabit._id = Date.now().toString();
    }
    
    setHabits([...habits, newHabit]);
    setNewHabitName('');
    setNewHabitCategory('Uncategorized');
    setShowAddHabit(false);
  };

  const toggleDay = async (habitId, date) => {
    const dateStr = formatDate(date);
    const updatedHabits = habits.map(habit => {
      if (habit._id === habitId) {
        const completedDays = { ...habit.completedDays };
        if (completedDays[dateStr]) {
          delete completedDays[dateStr];
        } else {
          completedDays[dateStr] = true;
        }
        
        if (mongoConfig.apiKey) {
          updateHabitInMongo(habitId, { completedDays });
        }
        
        return { ...habit, completedDays };
      }
      return habit;
    });
    
    setHabits(updatedHabits);
  };

  const deleteHabit = async (habitId) => {
    if (mongoConfig.apiKey) {
      await deleteHabitFromMongo(habitId);
    }
    setHabits(habits.filter(h => h._id !== habitId));
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
      setDailyNotes({
        ...dailyNotes,
        [dateStr]: currentNote
      });
      setShowNoteModal(false);
      setSelectedDate(null);
      setCurrentNote('');
    }
  };

  const groupedHabits = habits.reduce((acc, habit) => {
    const category = habit.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(habit);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Habit Tracker 2026</h1>
                <p className="text-sm text-gray-500">Track multiple habits daily</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'year'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Year
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={navigatePrev}
              disabled={!canNavigatePrev()}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-gray-700">{getViewTitle()}</h2>
            <button
              onClick={navigateNext}
              disabled={!canNavigateNext()}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* MongoDB Settings */}
          {showSettings && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">MongoDB Configuration</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="MongoDB Data API Key"
                  value={mongoConfig.apiKey}
                  onChange={(e) => setMongoConfig({...mongoConfig, apiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={loadHabitsFromMongo}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Connect & Load
                </button>
              </div>
              {isConnected && <p className="text-green-600 text-sm mt-2">✓ Connected</p>}
            </div>
          )}

          {/* Add Habit */}
          {showAddHabit ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                placeholder="Habit name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                autoFocus
              />
              <select
                value={newHabitCategory}
                onChange={(e) => setNewHabitCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={addHabit}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
          ) : (
            <button
              onClick={() => setShowAddHabit(true)}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add New Habit
            </button>
          )}
        </div>

        {/* Habits Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Habits Yet</h3>
            <p className="text-gray-500">Click "Add New Habit" to start tracking</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px] text-xs">HABITS</th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 w-12 text-xs">GOAL</th>
                    {dates.map((date, idx) => (
                      <th key={idx} className="px-1 py-2 text-center font-semibold text-gray-700 min-w-[50px]">
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
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20 text-xs">Progress</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedHabits).map(([category, categoryHabits]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-gray-100">
                        <td colSpan={dates.length + 4} className="px-3 py-1.5 font-bold text-gray-700 text-xs uppercase">
                          {category}
                        </td>
                      </tr>
                      {categoryHabits.map((habit, habitIdx) => {
                        const progress = calculateProgress(habit, dates);
                        
                        return (
                          <tr key={habit._id} className="border-b border-gray-100 hover:bg-green-50">
                            <td className="px-3 py-2 font-medium text-gray-800 text-xs">{habit.name}</td>
                            <td className="px-2 py-2 text-center text-gray-600 text-xs">{habit.goal}</td>
                            {dates.map((date, idx) => {
                              const dateStr = formatDate(date);
                              const isCompleted = habit.completedDays && habit.completedDays[dateStr];
                              
                              return (
                                <td key={idx} className="px-1 py-2">
                                  <button
                                    onClick={() => toggleDay(habit._id, date)}
                                    className={`w-8 h-8 rounded border transition-all ${
                                      isCompleted
                                        ? 'bg-green-500 border-green-600'
                                        : 'bg-white border-gray-300 hover:border-green-400'
                                    }`}
                                  >
                                    {isCompleted && (
                                      <svg className="w-5 h-5 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-2 py-2 text-center">
                              <div className="text-xs font-semibold text-green-600">{progress.percentage}%</div>
                              <div className="text-xs text-gray-500">{progress.completed}/{progress.total}</div>
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => deleteHabit(habit._id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
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

        {/* Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Daily Note - {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Write your notes for this day..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none h-32 text-sm"
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveNote}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Save Note
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
    </div>
  );
};

export default HabitTracker2026;