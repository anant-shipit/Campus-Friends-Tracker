import React, { memo } from 'react';
import { Card, Stack } from './Layout';
import './DashboardComponents.css';

// Section Header
export const SectionHeader = memo(({ title, action }) => (
  <div className="section-header">
    <h3 className="section-title">{title}</h3>
    {action && <div className="section-header-action">{action}</div>}
  </div>
));

// Dashboard Hero
export const DashboardHero = memo(({ title, subtitle, action, icon: Icon }) => (
  <Stack direction="row" align="center" justify="space-between" className="dashboard-hero">
    <Stack gap="xs" direction="row" align="center">
      {Icon && <div className="hero-icon"><Icon /></div>}
      <Stack gap="xs">
        <h1 className="hero-title">{title}</h1>
        {subtitle && <p className="hero-subtitle">{subtitle}</p>}
      </Stack>
    </Stack>
    {action && <div className="hero-cta">{action}</div>}
  </Stack>
));

// Segmented Control
export const SegmentedControl = memo(({ options, selectedIndex, onChange }) => {
  const handleKeyDown = (e, index) => {
    let newIndex = index;
    if (e.key === 'ArrowRight') newIndex = (index + 1) % options.length;
    else if (e.key === 'ArrowLeft') newIndex = (index - 1 + options.length) % options.length;
    else if (e.key === 'Home') newIndex = 0;
    else if (e.key === 'End') newIndex = options.length - 1;
    
    if (newIndex !== index) {
      e.preventDefault();
      onChange(newIndex);
      // Focus the newly selected tab
      const tabs = e.currentTarget.parentElement.querySelectorAll('[role="tab"]');
      if (tabs[newIndex]) tabs[newIndex].focus();
    }
  };

  return (
    <div className="segmented-control" role="tablist">
      <div 
        className="sc-indicator" 
        style={{ 
          width: `${100 / options.length}%`, 
          transform: `translateX(${selectedIndex * 100}%)` 
        }} 
      />
      {options.map((option, idx) => {
        const isSelected = selectedIndex === idx;
        return (
          <button
            key={option}
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`sc-btn ${isSelected ? 'active' : ''}`}
            onClick={() => onChange(idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
});

// Stat Card
export const StatCard = memo(({ title, value, description, action = null }) => (
  <Card className="stat-card" hoverable={!!action} onClick={action}>
    <h4 className="stat-title">{title}</h4>
    <div className="stat-value">{value}</div>
    {description && <div className="stat-desc">{description}</div>}
  </Card>
));

// Empty State
export const EmptyState = memo(({ icon: Icon, title, description, children, helperText }) => (
  <Card className="empty-state">
    <Stack align="center" gap="lg" className="empty-state-content">
      {Icon && <div className="empty-state-icon"><Icon /></div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {children}
      {helperText && <p className="empty-state-helper">{helperText}</p>}
    </Stack>
  </Card>
));

// Schedule Card
export const ScheduleCard = memo(({ startTime, endTime, statusText, statusColor = 'green', style }) => (
  <Card className="schedule-card" style={style}>
    <div className="sc-time">
      {startTime} - {endTime}
    </div>
    <div className="sc-label">
      <span className={`status-dot ${statusColor}`}></span> {statusText}
    </div>
  </Card>
));

// Skeleton Schedule Card
export const SkeletonScheduleCard = memo(({ style }) => (
  <Card className="schedule-card skeleton-card" style={style}>
    <div className="skeleton-text" style={{ width: '40%' }} />
    <div className="skeleton-text" style={{ width: '60%' }} />
  </Card>
));

// Skeleton Friend Card
export const SkeletonFriendCard = memo(({ style }) => (
  <Card className="skeleton-friend-card skeleton-card" style={style}>
    <div className="skeleton-friend-header">
      <div className="skeleton-dot" />
      <div className="skeleton-friend-info">
        <div className="skeleton-text" style={{ width: '120px', height: '16px' }} />
        <div className="skeleton-text" style={{ width: '60px', height: '12px', marginTop: '6px' }} />
      </div>
    </div>
    <div className="skeleton-friend-body">
      <div className="skeleton-text" style={{ width: '180px', height: '14px', marginTop: '16px' }} />
    </div>
  </Card>
));
