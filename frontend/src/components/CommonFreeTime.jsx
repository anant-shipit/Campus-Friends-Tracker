import React, { useState, useMemo, useCallback } from 'react';
import { getFriends } from '../utils/friendsStore';
import { findCommonFreeSlots, formatTime, getTodayIndex } from '../utils/timeUtils';
import { DashboardContainer, Section, Stack, Card } from './Layout';
import { DashboardHero, StatCard, SegmentedControl, EmptyState, ScheduleCard, SectionHeader } from './DashboardComponents';
import './CommonFreeTime.css';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const CommonFreeEmptyIcon = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="12" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
    <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M32 28V32L35 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 24H52" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />
  </svg>
);

export default function CommonFreeTime({ timetable }) {
  const friends = getFriends();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dayIndex, setDayIndex] = useState(getTodayIndex());
  const [showResults, setShowResults] = useState(false);

  const toggleFriend = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowResults(false);
  }, []);

  const handleDayChange = useCallback((idx) => {
    setDayIndex(idx);
    setShowResults(false);
  }, []);

  const freeSlots = useMemo(() => {
    if (!showResults || selectedIds.size < 2) return null;
    const batchCodes = friends
      .filter((f) => selectedIds.has(f.id))
      .map((f) => f.batchCode);
    return findCommonFreeSlots(timetable, batchCodes, dayIndex);
  }, [showResults, selectedIds, friends, timetable, dayIndex]);

  const handleFind = () => setShowResults(true);

  const longestSlotDuration = useMemo(() => {
    if (!freeSlots || freeSlots.length === 0) return '—';
    let max = 0;
    for (const slot of freeSlots) {
      if (!slot.startTime || !slot.endTime) continue;
      const start = new Date(`1970-01-01T${slot.startTime}Z`);
      const end = new Date(`1970-01-01T${slot.endTime}Z`);
      if (isNaN(start) || isNaN(end)) continue;
      const diff = Math.round((end - start) / 60000);
      if (diff > max) max = diff;
    }
    return max > 0 ? `${max} min` : '—';
  }, [freeSlots]);

  const isEmpty = friends.length === 0;

  return (
    <DashboardContainer className="fade-in-up">
      <DashboardHero 
        title="Common Free Time" 
        subtitle="Find overlapping free slots between your friends."
      />

      <div className="stats-row-wrapper">
        <Stack direction="row" gap="md" className="stats-row">
          <StatCard 
            title="Selected" 
            value={selectedIds.size} 
          />
          <StatCard 
            title="Matching Slots" 
            value={freeSlots?.length ?? 0} 
          />
          <StatCard 
            title="Longest Slot" 
            value={longestSlotDuration} 
          />
          <StatCard 
            title="Day" 
            value={DAY_NAMES[dayIndex].slice(0, 3)} 
          />
        </Stack>
      </div>

      <Section className="cft-selection-section">
        <SectionHeader title="Select Friends" />
        
        {isEmpty ? (
          <div className="cft-empty-wrapper">
            <EmptyState
              icon={CommonFreeEmptyIcon}
              title="No Friends Added"
              description="You need to add at least two friends to find common free time."
              helperText="Once added, select them here to compare schedules."
            />
          </div>
        ) : (
          <Stack gap="lg">
            <div className="cft-friends-grid">
              {friends.map((f) => {
                const isSelected = selectedIds.has(f.id);
                return (
                  <Card 
                    key={f.id}
                    className={`cft-friend-card ${isSelected ? 'selected' : ''}`}
                    hoverable
                    onClick={() => toggleFriend(f.id)}
                  >
                    <div className={`cft-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <div className="cft-friend-info">
                      <span className="cft-friend-name">{f.name}</span>
                      <span className="cft-friend-batch">{f.batchCode}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
            <button 
              className="btn btn-primary cft-find-btn"
              disabled={selectedIds.size < 2}
              onClick={handleFind}
            >
              Find Free Slots ({selectedIds.size} selected)
            </button>
          </Stack>
        )}
      </Section>

      {!isEmpty && (
        <Section className="schedule-section">
          <SectionHeader 
            title="Schedule" 
            action={
              <div className="segmented-control-wrapper">
                <SegmentedControl 
                  options={DAY_NAMES.map(d => d.slice(0, 3))} 
                  selectedIndex={dayIndex} 
                  onChange={handleDayChange} 
                />
              </div>
            }
          />
          
          <div className="schedule-content">
            {freeSlots === null ? (
              <Card className="no-results-card">
                <p className="no-results-title">Pick two or more friends</p>
                <p className="no-results-desc">Then tap “Find Free Slots” to compare their schedules for {DAY_NAMES[dayIndex]}.</p>
              </Card>
            ) : freeSlots.length === 0 ? (
              <Card className="no-results-card fade-transition">
                <p className="no-results-title">No overlapping free time on {DAY_NAMES[dayIndex]}.</p>
                <p className="no-results-desc">Try selecting a different day or fewer friends.</p>
              </Card>
            ) : (
              <div className="slots-list">
                {freeSlots.map((slot, i) => (
                  <ScheduleCard 
                    key={`${slot.startTime}-${i}`}
                    startTime={formatTime(slot.startTime)}
                    endTime={formatTime(slot.endTime)}
                    statusText="Everyone is free"
                    statusColor="green"
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </Section>
      )}
    </DashboardContainer>
  );
}
