import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFriends } from '../utils/friendsStore';
import { getPrivateSessionSlots, getTodayIndex, formatTime } from '../utils/timeUtils';
import { Container, Section, Stack, Card } from './Layout';
import { StatCard, SegmentedControl, EmptyState, ScheduleCard, SkeletonScheduleCard } from './DashboardComponents';
import './PrivateSession.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Premium Monochrome Line-Art SVG for Empty State
const RoommatesEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="12" width="48" height="40" rx="8" stroke="url(#emptyGrad)" strokeWidth="1.5" strokeDasharray="4 4" fill="rgba(255,255,255,0.02)" />
    <path d="M32 24C28.6863 24 26 26.6863 26 30C26 33.3137 28.6863 36 32 36C35.3137 36 38 33.3137 38 30C38 26.6863 35.3137 24 32 24Z" stroke="url(#emptyGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 44C22 39.5817 26.4772 36 32 36C37.5228 36 42 39.5817 42 44" stroke="url(#emptyGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
  </svg>
);

export default function PrivateSession({ refreshKey, timetable, onAddRoommate, onSelectFriend }) {
  const [roommates, setRoommates] = useState([]);
  const [slots, setSlots] = useState([]);
  const [dayIndex, setDayIndex] = useState(getTodayIndex());

  useEffect(() => {
    const allFriends = getFriends();
    const rms = allFriends.filter(f => f.isRoommate);
    setRoommates(rms);

    if (rms.length > 0 && timetable) {
      const batchCodes = rms.map(r => r.batchCode);
      const calculatedSlots = getPrivateSessionSlots(timetable, batchCodes, dayIndex);
      setSlots(calculatedSlots);
    } else {
      setSlots([]);
    }
  }, [timetable, dayIndex, refreshKey]);

  const handleDayChange = useCallback((idx) => {
    setDayIndex(idx);
  }, []);

  // Calculate total free hours
  const totalFreeHours = useMemo(() => {
    if (slots.length === 0) return 0;
    const hours = slots.reduce((acc, slot) => {
      // Assuming slot times are HH:MM string, parse to decimal hours for quick display
      const start = slot.startTime.split(':').map(Number);
      const end = slot.endTime.split(':').map(Number);
      const startDecimal = start[0] + start[1] / 60;
      const endDecimal = end[0] + end[1] / 60;
      return acc + (endDecimal - startDecimal);
    }, 0);
    return Math.round(hours * 10) / 10;
  }, [slots]);

  const isEmpty = roommates.length === 0;

  return (
    <Container className="dashboard-page fade-in-up">
      <Section className="dashboard-hero">
        <Stack direction="row" align="center" justify="space-between" className="hero-top">
          <Stack gap="xs">
            <h1 className="hero-title">Room Availability</h1>
            <p className="hero-subtitle">Find shared free time when all roommates are in class.</p>
          </Stack>
          <button className="btn btn-primary btn-sm hero-cta" onClick={onAddRoommate}>
            + Add Roommate
          </button>
        </Stack>

        <Stack direction="row" gap="md" className="stats-row">
          <StatCard 
            title="Roommates" 
            value={roommates.length} 
            description="Active tracking"
          />
          <StatCard 
            title="Free Slots" 
            value={slots.length} 
            description={`On ${DAYS[dayIndex]}`}
          />
          <StatCard 
            title="Free Hours" 
            value={totalFreeHours} 
            description="Total duration"
          />
        </Stack>
      </Section>

      {!isEmpty && (
        <Section className="roommates-list">
          <Stack direction="row" gap="md" className="horizontal-scroll">
            {roommates.map(friend => (
              <Card key={friend.id} className="roommate-chip" hoverable onClick={() => onSelectFriend(friend)}>
                <span className="name">{friend.name}</span>
                <span className="batch">{friend.batchCode}</span>
              </Card>
            ))}
          </Stack>
        </Section>
      )}

      <Section className="schedule-section">
        <Stack gap="lg">
          <Stack direction="row" align="center" justify="space-between" className="schedule-header">
            <h3 className="section-title">Schedule</h3>
            <div className="segmented-control-wrapper">
              <SegmentedControl 
                options={DAYS.map(d => d.slice(0, 3))} 
                selectedIndex={dayIndex} 
                onChange={handleDayChange} 
              />
            </div>
          </Stack>

          <div className="schedule-content">
            {isEmpty ? (
              <EmptyState
                icon={RoommatesEmptyIcon}
                title="No Roommates Added"
                description="Add your roommates to instantly calculate when your room is completely free."
              >
                <button className="btn btn-primary" onClick={onAddRoommate}>
                  Add First Roommate
                </button>
                <div className="skeleton-previews">
                  <SkeletonScheduleCard style={{ transform: 'scale(0.98)', opacity: 0.6 }} />
                  <SkeletonScheduleCard style={{ transform: 'scale(0.95)', opacity: 0.4 }} />
                  <SkeletonScheduleCard style={{ transform: 'scale(0.92)', opacity: 0.2 }} />
                </div>
              </EmptyState>
            ) : slots.length === 0 ? (
              <Card className="empty-slots">
                <p>No intersecting classes found for {DAYS[dayIndex] || 'today'}.</p>
                <p className="sub">Someone will always be in the room!</p>
              </Card>
            ) : (
              <div className="slots-list">
                {slots.map((slot, i) => (
                  <ScheduleCard 
                    key={`${slot.startTime}-${i}`}
                    startTime={formatTime(slot.startTime)}
                    endTime={formatTime(slot.endTime)}
                    statusText="Everyone is in class"
                    statusColor="green"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </Stack>
      </Section>
    </Container>
  );
}
