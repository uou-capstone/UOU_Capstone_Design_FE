import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './TruckLoader.css';

const TruckLoader: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className="newtons-cradle"
      style={
        {
          '--uib-color': isDarkMode ? '#FFFFFF' : '#141414',
        } as React.CSSProperties
      }
    >
      <div className="newtons-cradle__dot" />
      <div className="newtons-cradle__dot" />
      <div className="newtons-cradle__dot" />
      <div className="newtons-cradle__dot" />
    </div>
  );
};

export default TruckLoader;

