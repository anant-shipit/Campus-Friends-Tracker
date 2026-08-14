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

export default function EmptyRoomFinder() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [sortBy, setSortBy] = useState('most_time');
  const [activeSession, setActiveSession] = useState(null);

  // Load data
  useEffect(() => {
    fetch('/rooms.json')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load rooms.json", err);
        setLoading(false);
      });
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
      } catch(e) {}
    }
  }, []);

  const handleUseRoom = (room, endTimeStr) => {
    const endMinutes = timeStrToInt(endTimeStr);
    const sessionData = { room, endTimeStr, endMinutes, date: new Date().toDateString() };
    localStorage.setItem('activeRoomSession', JSON.stringify(sessionData));
    setActiveSession(sessionData);
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('activeRoomSession');
    setActiveSession(null);
  };

  // Derive current status
  const currentStatus = useMemo(() => {
    const dayIndex = currentTime.getDay();
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const currentDayName = DAY_NAMES[dayIndex];
    
    const nowH = currentTime.getHours();
    const nowM = currentTime.getMinutes();
    const nowMinutes = nowH * 60 + nowM;
    
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
      dayName: currentDayName,
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
    if (activeSession.date !== new Date().toDateString()) {
      handleLeaveRoom(); // expired session
      return "";
    }
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
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

  if (loading) return <div className="text-center p-8 text-white">Loading room data...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      
      {activeSession && getSessionTimeLeft() && (
        <div className="mb-6 bg-purple-600 rounded-xl p-4 shadow-lg text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold">You are using Room {activeSession.room}</h3>
            <p className="text-purple-100 text-sm">Time remaining: {getSessionTimeLeft()} (Until {activeSession.endTimeStr})</p>
          </div>
          <button 
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-purple-800 hover:bg-purple-900 rounded-lg text-sm font-semibold transition-colors"
          >
            Leave Room
          </button>
        </div>
      )}

      {currentStatus.isOver ? (
        <div className="bg-transparent rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-8xl mb-8">🎉</div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">{currentStatus.message}</h2>
          <p className="text-2xl text-slate-400">Enjoy your free time!</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Empty Rooms</h2>
              <p className="text-slate-400 text-sm">
                Current slot: <span className="text-purple-400 font-semibold">{currentStatus.activeSlotStr}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm mr-2">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="bg-[#1c212d] text-white border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="most_time">Most Time Left</option>
                <option value="least_time">Least Time Left</option>
              </select>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {blocks.map(b => (
              <button
                key={b}
                onClick={() => setSelectedBlock(b)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedBlock === b 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50' 
                    : 'bg-[#1c212d] text-slate-300 hover:bg-white/10 border border-white/5'
                }`}
              >
                {b === 'All' ? 'All Blocks' : `${b} Block`}
              </button>
            ))}
          </div>

          {displayRooms.length === 0 ? (
            <div className="text-center p-8 text-slate-400 bg-[#1c212d] rounded-xl border border-white/5">
              No empty rooms found for this block.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayRooms.map(room => (
                <div key={room.room} className="bg-[#1c212d] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white">{room.room}</h3>
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-md font-medium border border-green-500/20">
                        {room.block} Block
                      </span>
                    </div>
                    <div className="mb-4">
                      <p className="text-slate-300 text-lg font-semibold">{formatMinutes(room.minutesLeft)} left</p>
                      <p className="text-slate-500 text-sm">Free until {room.endTimeStr}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUseRoom(room.room, room.endTimeStr)}
                    className="w-full py-2.5 bg-white/5 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors border border-white/10 hover:border-purple-500"
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
