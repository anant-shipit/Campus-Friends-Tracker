import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFriends, removeFriend, toggleRoommate } from '../utils/friendsStore';
import { computeFriendStatus } from '../utils/timeUtils';
import FriendCard from './FriendCard';
import { useToast } from './ToastProvider';
import { DashboardContainer, Section, Stack, Card } from './Layout';
import { DashboardHero, StatCard, SegmentedControl, EmptyState, SkeletonFriendCard, SectionHeader } from './DashboardComponents';
import './Dashboard.css';

const FILTER_OPTIONS = ['All', 'Free Now', 'In Class'];

const FriendsEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="12" width="48" height="40" rx="8" stroke="url(#friendsEmptyGrad)" strokeWidth="1.5" strokeDasharray="4 4" fill="rgba(255,255,255,0.02)" />
    <circle cx="26" cy="28" r="5" stroke="url(#friendsEmptyGrad)" strokeWidth="1.5" />
    <path d="M18 42C18 38 21.5 35 26 35C30.5 35 34 38 34 42" stroke="url(#friendsEmptyGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="42" cy="32" r="4" stroke="url(#friendsEmptyGrad)" strokeWidth="1.5" opacity="0.6" />
    <path d="M36 42C36 39 38.5 37 42 37C45.5 37 48 39 48 42" stroke="url(#friendsEmptyGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <defs>
      <linearGradient id="friendsEmptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Dashboard({ refreshKey, timetable, onSelectFriend, onRefresh, onAddFriend }) {
  const [friends, setFriends] = useState([]);
  const [filterIndex, setFilterIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showToast } = useToast();

  const loadFriends = useCallback(() => {
    const raw = getFriends();
    const withStatus = raw.map((f) => computeFriendStatus(f, timetable, currentTime));
    setFriends(withStatus);
  }, [timetable, currentTime]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
    try {
      removeFriend(id);
      showToast('Friend removed', 'success');
      onRefresh();
    } catch {
      showToast('Failed to remove friend', 'error');
    }
  };

  const handleToggleRoommate = (id, isRoommate) => {
    try {
      toggleRoommate(id, isRoommate);
      if (isRoommate) {
        showToast('Added as roommate 🏠', 'success');
      } else {
        showToast('Removed from roommates', 'info');
      }
      onRefresh();
    } catch {
      showToast('Failed to update roommate status', 'error');
    }
  };

  const freeCount = useMemo(() => friends.filter((f) => f.currentStatus === 'free').length, [friends]);
  const busyCount = useMemo(() => friends.filter((f) => f.currentStatus === 'in_class').length, [friends]);
  const roommatesCount = useMemo(() => friends.filter((f) => f.isRoommate).length, [friends]);

  const filtered = useMemo(() => {
    const activeFilter = FILTER_OPTIONS[filterIndex];
    return friends.filter((f) => {
      if (activeFilter === 'Free Now') return f.currentStatus === 'free';
      if (activeFilter === 'In Class') return f.currentStatus === 'in_class';
      return true;
    });
  }, [friends, filterIndex]);

  const isEmpty = friends.length === 0;

  return (
    <DashboardContainer className="fade-in-up">
      <DashboardHero 
        title="Friends" 
        subtitle="Track your classmates' schedules and find free time together."
        action={
          <button className="btn btn-primary" onClick={onAddFriend}>
            + Add Friend
          </button>
        }
      />

      <div className="stats-row-wrapper">
        <Stack direction="row" gap="md" className="stats-row">
          <StatCard 
            title="Total Friends" 
            value={friends.length} 
          />
          <StatCard 
            title="Free Now" 
            value={freeCount} 
          />
          <StatCard 
            title="In Class" 
            value={busyCount} 
          />
          <StatCard 
            title="Roommates" 
            value={roommatesCount} 
          />
        </Stack>
      </div>

      <Section className="friends-section">
        <SectionHeader 
          title="Your Friends" 
          action={
            <div className="filter-wrapper">
              <SegmentedControl 
                options={FILTER_OPTIONS}
                selectedIndex={filterIndex}
                onChange={setFilterIndex}
              />
            </div>
          }
        />

        <div className="friends-list-wrapper">
          {isEmpty ? (
            <EmptyState
              icon={FriendsEmptyIcon}
              title="No Friends Added Yet"
              description="Add your first friend to start tracking schedules and finding free time."
              helperText="Friends you add will appear here with their live availability status."
            >
              <button className="btn btn-primary" onClick={onAddFriend}>
                Add Your First Friend
              </button>
              <div className="skeleton-previews">
                <SkeletonFriendCard style={{ transform: 'scale(0.98)', opacity: 0.6 }} />
                <SkeletonFriendCard style={{ transform: 'scale(0.95)', opacity: 0.4 }} />
                <SkeletonFriendCard style={{ transform: 'scale(0.92)', opacity: 0.2 }} />
              </div>
            </EmptyState>
          ) : (
            <div className="friends-list">
              {filtered.length === 0 ? (
                <Card className="no-results-card fade-transition">
                  <p className="no-results-title">No friends match this filter</p>
                  <p className="no-results-desc">Try selecting a different filter above.</p>
                </Card>
              ) : (
                filtered.map((friend, i) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onTap={onSelectFriend}
                    onDelete={handleDelete}
                    onToggleRoommate={handleToggleRoommate}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </Section>
    </DashboardContainer>
  );
}
