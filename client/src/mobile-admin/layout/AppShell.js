import React from 'react';
import TopBar from './TopBar';
import BottomTabBar from './BottomTabBar';

const AppShell = ({
  title,
  subtitle,
  leftIcon,
  onLeft,
  rightIcon,
  onRight,
  activeTab,
  onTabChange,
  badges,
  hideTabBar,
  offline,
  children,
}) => (
  <>
    <TopBar
      title={title}
      subtitle={subtitle}
      leftIcon={leftIcon}
      onLeft={onLeft}
      rightIcon={rightIcon}
      onRight={onRight}
    />
    {offline && <div className="m-offline">You're offline — changes won't sync</div>}
    <div className={hideTabBar ? 'm-scroll m-scroll-no-tabs' : 'm-scroll'}>
      {children}
    </div>
    {!hideTabBar && activeTab && (
      <BottomTabBar active={activeTab} onChange={onTabChange} badges={badges || {}} />
    )}
  </>
);

export default AppShell;
