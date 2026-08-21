import React, { useState, useEffect, useMemo } from 'react';

const SLOT_TIMES = [
  "8:00am", "8:50am", "9:40am", "10:30am", "11:20am", "12:10pm",
  "1:00pm", "1:50pm", "2:40pm", "3:30pm", "4:20pm", "5:10pm", "6:00pm", "6:50pm"
];
const END_OF_DAY = "7:40pm";

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeStrToInt(tStr) {
  if (!tStr) return 0;
  const match = tStr.match(/(\d+):(\d+)(am|pm)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return h * 60 + m;
}

function getKolkataTimeInfo(date) {
  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
  const weekdayName = dayFormatter.format(date);

  const dateKeyFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
  const dateKey = dateKeyFormatter.format(date);

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
  const timeStr = timeFormatter.format(date);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const nowMinutes = hours * 60 + minutes;

  return { weekdayName, dateKey, nowMinutes };
}

export default function EmptyRoomFinder() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [sortBy, setSortBy] = useState('most_time');
  const [activeSession, setActiveSession] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetch('/rooms.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load rooms.json", err);
        setError(err.message || "Failed to load room data.");
        setLoading(false);
      });
  };

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load / Update active session
  useEffect(() => {
    const session = localStorage.getItem('activeRoomSession');
    if (session) {
      try {
        setActiveSession(JSON.parse(session));
      } catch (error) {
        console.warn('Failed to parse active room session:', error);
      }
    }
  }, []);

  const handleUseRoom = (room, endTimeStr) => {
    const endMinutes = timeStrToInt(endTimeStr);
    const { dateKey } = getKolkataTimeInfo(new Date());
    const sessionData = { room, endTimeStr, endMinutes, date: dateKey };
    localStorage.setItem('activeRoomSession', JSON.stringify(sessionData));
    setActiveSession(sessionData);
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('activeRoomSession');
    setActiveSession(null);
  };

  // Derive current status
  const currentStatus = useMemo(() => {
    const { weekdayName, nowMinutes } = getKolkataTimeInfo(currentTime);
    const isWeekend = weekdayName === 'Saturday' || weekdayName === 'Sunday';
    
    if (isWeekend) return { isOver: true, message: "Classes are over for the weekend" };
    
    if (nowMinutes >= timeStrToInt(END_OF_DAY)) {
      return { isOver: true, message: "Classes are over for the day" };
    }
    if (nowMinutes < timeStrToInt(SLOT_TIMES[0])) {
      return { isOver: true, message: "Classes haven't started yet today" };
    }

    // Find the active slot
    let activeSlotIndex = -1;
    for (let i = SLOT_TIMES.length - 1; i >= 0; i--) {
      if (nowMinutes >= timeStrToInt(SLOT_TIMES[i])) {
        activeSlotIndex = i;
        break;
      }
    }

    if (activeSlotIndex === -1) return { isOver: true, message: "Unknown time slot" };

    return {
      isOver: false,
      dayName: weekdayName,
      activeSlotIndex,
      activeSlotStr: SLOT_TIMES[activeSlotIndex],
      nowMinutes
    };
  }, [currentTime]);

  // Derive rooms with countdown
  const roomData = useMemo(() => {
    if (!data || currentStatus.isOver) return [];
    
    const { dayName, activeSlotIndex, nowMinutes } = currentStatus;
    const dayData = data.availability?.[dayName];
    if (!dayData) return [];

    const activeSlotData = dayData[SLOT_TIMES[activeSlotIndex]];
    if (!activeSlotData || !activeSlotData.free) return [];

    const freeRoomsNow = activeSlotData.free;
    const processedRooms = [];

    freeRoomsNow.forEach(room => {
      let endTimeStr = END_OF_DAY;
      // Look ahead
      for (let i = activeSlotIndex + 1; i < SLOT_TIMES.length; i++) {
        const futureSlot = SLOT_TIMES[i];
        const futureData = dayData[futureSlot];
        if (futureData && futureData.occupied && futureData.occupied.includes(room)) {
          endTimeStr = futureSlot;
          break;
        }
      }

      const endMinutes = timeStrToInt(endTimeStr);
      const minutesLeft = endMinutes - nowMinutes;

      // Extract block
      const blockMatch = room.match(/^[A-Za-z]+/);
      const block = blockMatch ? blockMatch[0] : 'Other';

      processedRooms.push({
        room,
        endTimeStr,
        minutesLeft,
        block
      });
    });

    return processedRooms;
  }, [data, currentStatus]);

  // Derived filters
  const blocks = useMemo(() => {
    const b = new Set(roomData.map(r => r.block));
    return ['All', ...Array.from(b).sort()];
  }, [roomData]);

  // Filtered and sorted rooms
  const displayRooms = useMemo(() => {
    let filtered = roomData;
    if (selectedBlock !== 'All') {
      filtered = filtered.filter(r => r.block === selectedBlock);
    }
    return filtered.sort((a, b) => {
      if (sortBy === 'most_time') return b.minutesLeft - a.minutesLeft;
      return a.minutesLeft - b.minutesLeft;
    });
  }, [roomData, selectedBlock, sortBy]);

  // Session string
  const getSessionTimeLeft = () => {
    if (!activeSession) return "";
    const { dateKey, nowMinutes } = getKolkataTimeInfo(currentTime);
    if (activeSession.date !== dateKey) {
      handleLeaveRoom(); // expired session
      return "";
    }
    const diff = activeSession.endMinutes - nowMinutes;
    if (diff <= 0) {
      handleLeaveRoom();
      return "";
    }
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m`;
  };

  const formatMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m`;
  };

  if (loading) return <div className="w-full max-w-4xl mx-auto py-16 text-center text-[var(--text-secondary)]">Loading room data…</div>;

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 text-center">
        <p className="mb-4 font-semibold" style={{ color: 'var(--color-lecture)' }}>{error}</p>
        <button onClick={loadData} className="btn btn-secondary">Retry</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">

      {activeSession && getSessionTimeLeft() && (
        <div className="panel mb-6 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderLeft: '3px solid var(--color-free)' }}>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Using Room <span className="mono">{activeSession.room}</span></h3>
            <p className="text-[var(--text-secondary)] text-sm">Time remaining <span className="mono">{getSessionTimeLeft()}</span> · until <span className="mono">{activeSession.endTimeStr}</span></p>
          </div>
          <button onClick={handleLeaveRoom} className="btn btn-secondary btn-sm">Leave Room</button>
        </div>
      )}

      {currentStatus.isOver ? (
        <div className="py-24 text-center flex flex-col items-center justify-center min-h-[50vh]">
          <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-3">No classes</p>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{currentStatus.message}</h2>
          <p className="text-[var(--text-secondary)]">Enjoy your free time.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Empty Rooms</h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Current slot <span className="mono font-semibold text-[var(--text-primary)]">{currentStatus.activeSlotStr}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by-select" className="text-[var(--text-secondary)] text-sm">Sort</label>
              <select
                id="sort-by-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--border-strong)]"
              >
                <option value="most_time">Most time left</option>
                <option value="least_time">Least time left</option>
              </select>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {blocks.map(b => (
              <button
                key={b}
                onClick={() => setSelectedBlock(b)}
                className={`mono text-xs px-3 py-1.5 rounded-[var(--radius-sm)] border transition-colors ${
                  selectedBlock === b
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] border-[var(--accent)] font-semibold'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
              >
                {b === 'All' ? 'ALL BLOCKS' : `${b} BLOCK`}
              </button>
            ))}
          </div>

          {displayRooms.length === 0 ? (
            <div className="panel text-center p-8 text-[var(--text-secondary)]">
              No empty rooms found for this block.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayRooms.map(room => (
                <div key={room.room} className="panel p-4 flex flex-col justify-between transition-colors hover:border-[var(--border-strong)]" style={{ borderLeft: '3px solid var(--color-free)' }}>
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold mono text-[var(--text-primary)]">{room.room}</h3>
                      <span className="chip chip-free">{room.block}</span>
                    </div>
                    <div className="mb-4">
                      <p className="text-[var(--text-primary)] text-base font-semibold"><span className="mono">{formatMinutes(room.minutesLeft)}</span> left</p>
                      <p className="text-[var(--text-tertiary)] text-sm">Free until <span className="mono">{room.endTimeStr}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUseRoom(room.room, room.endTimeStr)}
                    className="btn btn-secondary btn-sm w-full"
                  >
                    Use it Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
