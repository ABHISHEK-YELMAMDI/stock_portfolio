import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAppStore from '../context/AppState';
import { motion } from 'framer-motion';

const Header = () => {
  const { theme, toggleTheme } = useAppStore();
  const location = useLocation();

  return (
    <motion.header
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`header ${theme}`}
    >
      <div className="logo">
        <Link to="/">RiskWise</Link>
      </div>
      <nav>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
        <Link to="/simulation" className={location.pathname === '/simulation' ? 'active' : ''}>Simulation</Link>
        <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>History</Link>
        <Link to="/comparison" className={location.pathname === '/comparison' ? 'active' : ''}>Comparison</Link>
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </nav>
    </motion.header>
  );
};

export default Header;