import React from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../context/AppState';
import { motion } from 'framer-motion';

const History = () => {
  const { simulations, removeSimulation } = useAppStore();

  return (
    <motion.div
      className="history-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2>Simulation History</h2>
      {simulations.length === 0 ? (
        <p>No simulations found. Run a simulation to see results here.</p>
      ) : (
        <div className="simulation-list">
          {simulations.map((simulation, index) => (
            <div key={simulation.id} className="simulation-item">
              <h3>Simulation {index + 1}</h3>
              <p><strong>Investment:</strong> €{simulation.params.initialInvestment}</p>
              <p><strong>Years:</strong> {simulation.params.years}</p>
              <p><strong>Discount Rate:</strong> {(simulation.params.discountRate * 100).toFixed(2)}%</p>
              <p><strong>Stocks:</strong> {simulation.params.tickers.join(', ')}</p>
              <p><strong>Weights:</strong> {simulation.params.weights.join(', ')}</p>
              <div className="simulation-actions">
                <Link to={`/comparison?sim1=${index}`}>Compare</Link>
                <button onClick={() => removeSimulation(index)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default History;