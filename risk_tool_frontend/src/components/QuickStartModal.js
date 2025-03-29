import React, { useState } from 'react';
import { motion } from 'framer-motion';

const QuickStartModal = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    { title: 'Welcome to RiskWise', content: 'This tool helps you analyze financial risk for your investment portfolio using Monte Carlo Simulations.' },
    { title: 'Step 1: Enter Parameters', content: 'Input your investment amount, time horizon, discount rate, and select stocks with weights.' },
    { title: 'Step 2: Run Simulation', content: 'Click "Run Simulation" to see detailed risk analysis, including NPV, VaR, and Sharpe Ratio.' },
    { title: 'Step 3: Explore Results', content: 'View visualizations like NPV histograms, cumulative probability curves, and historical price trends.' },
  ];

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onClose();
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h2>{steps[step].title}</h2>
        <p>{steps[step].content}</p>
        <div className="modal-buttons">
          <button onClick={onClose}>Skip</button>
          <button onClick={nextStep}>{step === steps.length - 1 ? 'Get Started' : 'Next'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuickStartModal;