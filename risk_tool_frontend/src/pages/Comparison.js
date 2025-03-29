import React from 'react';
import { useLocation } from 'react-router-dom';
import useAppStore from '../context/AppState';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';

const Comparison = () => {
  const { simulations } = useAppStore();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sim1Index = parseInt(params.get('sim1'), 10);
  const sim2Index = parseInt(params.get('sim2'), 10);

  const sim1 = simulations[sim1Index];
  const sim2 = simulations[sim2Index];

  const comparisonChartData = {
    labels: ['Mean NPV', 'Risk Probability', 'VaR (95%)', 'Sharpe Ratio'],
    datasets: [
      {
        label: `Simulation ${sim1Index + 1}`,
        data: [
          sim1?.results.portfolio.mean_npv,
          sim1?.results.portfolio.risk_prob * 100,
          sim1?.results.portfolio.var_95,
          sim1?.results.portfolio.sharpe_ratio,
        ],
        backgroundColor: 'rgba(30, 58, 138, 0.6)',
      },
      {
        label: `Simulation ${sim2Index + 1}`,
        data: [
          sim2?.results.portfolio.mean_npv,
          sim2?.results.portfolio.risk_prob * 100,
          sim2?.results.portfolio.var_95,
          sim2?.results.portfolio.sharpe_ratio,
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  const comparisonChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Portfolio Comparison' },
    },
    scales: {
      y: { title: { display: true, text: 'Value' } },
    },
  };

  return (
    <motion.div
      className="comparison-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2>Portfolio Comparison</h2>
      {!sim1 || !sim2 ? (
        <p>Please select two simulations to compare from the History page.</p>
      ) : (
        <div>
          <div className="comparison-details">
            <div>
              <h3>Simulation {sim1Index + 1}</h3>
              <p><strong>Investment:</strong> €{sim1.params.initialInvestment}</p>
              <p><strong>Stocks:</strong> {sim1.params.tickers.join(', ')}</p>
              <p><strong>Weights:</strong> {sim1.params.weights.join(', ')}</p>
            </div>
            <div>
              <h3>Simulation {sim2Index + 1}</h3>
              <p><strong>Investment:</strong> €{sim2.params.initialInvestment}</p>
              <p><strong>Stocks:</strong> {sim2.params.tickers.join(', ')}</p>
              <p><strong>Weights:</strong> {sim2.params.weights.join(', ')}</p>
            </div>
          </div>
          <div className="chart-container">
            <Bar data={comparisonChartData} options={comparisonChartOptions} />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Comparison;