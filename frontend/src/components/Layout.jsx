import React from 'react';
import './Layout.css';

export const Container = ({ children, className = '', ...props }) => (
  <div className={`layout-container ${className}`} {...props}>
    {children}
  </div>
);

export const DashboardContainer = ({ children, className = '', ...props }) => (
  <div className={`dashboard-container ${className}`} {...props}>
    {children}
  </div>
);

export const Section = ({ children, className = '', ...props }) => (
  <section className={`layout-section ${className}`} {...props}>
    {children}
  </section>
);

export const Stack = ({ children, direction = 'column', gap = 'md', align = 'stretch', justify = 'flex-start', className = '', ...props }) => {
  const inlineStyle = {
    display: 'flex',
    flexDirection: direction,
    gap: `var(--space-${gap}, ${gap})`,
    alignItems: align,
    justifyContent: justify,
  };
  return (
    <div style={inlineStyle} className={`layout-stack ${className}`} {...props}>
      {children}
    </div>
  );
};

export const Card = ({ children, className = '', hoverable = false, ...props }) => (
  <div className={`layout-card ${hoverable ? 'hoverable' : ''} ${className}`} {...props}>
    {children}
  </div>
);
