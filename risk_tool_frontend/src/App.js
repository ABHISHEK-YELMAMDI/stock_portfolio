import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import SimulationResults from './components/SimulationResults';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Simulation from './pages/Simulation';
import History from './pages/History';
import Comparison from './pages/Comparison';
import useAppStore from './context/AppState';
import './App.css';

function App() {
  const location = useLocation(); // Get the current location

  const { theme } = useAppStore();

  return (
      <div className={`App ${theme}`}>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/history" element={<History />} />
          <Route path="/simulation-results" element={<SimulationResults location={location} />} />
          <Route path="/comparison" element={<Comparison />} />
        </Routes>
        <Footer />
      </div>
  );
}

export default App;
