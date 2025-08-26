import React from 'react';

const LucideIcon = ({ 'data-testid': dataTestid }) => <svg data-testid={dataTestid} />;

const createReactComponent = (iconName) => {
  const Component = (props) => <LucideIcon {...props} />;
  Component.displayName = iconName;
  return Component;
};

export const Plus = createReactComponent('Plus');
export const LogOut = createReactComponent('LogOut');
