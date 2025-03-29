import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { CSVLink } from 'react-csv';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import useAppStore from '../context/AppState';
import { motion } from 'framer-motion';
import { Tooltip as ReactTooltip } from 'react-tooltip';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Simulation = () => {
  const [formData, setFormData] = useState({
    initialInvestment: 1000000,
    years: 5,
    discountRate: 0.05,
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [popularStocks] = useState(['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'NVDA', 'META', 'JPM', 'WMT', 'DIS']);
  const [selectedStocks, setSelectedStocks] = useState(['AAPL', 'MSFT', 'TSLA']);
  const [weights, setWeights] = useState([0.33, 0.33, 0.34]);
  const [weightError, setWeightError] = useState('');
  const { addSimulation } = useAppStore();

  useEffect(() => {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      setWeightError('Weights must sum to 1');
    } else {
      setWeightError('');
    }
  }, [weights]);

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleStockChange = (index, value) => {
    const newStocks = [...selectedStocks];
    newStocks[index] = value;
    setSelectedStocks(newStocks);
  };

  const handleWeightChange = (index, value) => {
    const newWeights = [...weights];
    newWeights[index] = parseFloat(value) || 0;
    setWeights(newWeights);
  };

  const addStock = () => {
    setSelectedStocks([...selectedStocks, popularStocks[0]]);
    setWeights([...weights, 0]);
  };

  const removeStock = (index) => {
    setSelectedStocks(selectedStocks.filter((_, i) => i !== index));
    setWeights(weights.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (weightError) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://127.0.0.1:5000/api/simulate', {
        params: {
          initial_investment: formData.initialInvestment,
          years: formData.years,
          discount_rate: formData.discountRate,
          tickers: selectedStocks.join(','),
          weights: weights.join(','),
        },
      });
      setResults(response.data);
      addSimulation({
        id: Date.now(),
        params: { ...formData, tickers: selectedStocks, weights },
        results: response.data,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const input = document.getElementById('results-section');
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('simulation-results.pdf');
    });
  };

  const csvData = results
    ? [
        { "Portfolio Mean NPV": results.portfolio.mean_npv, "Portfolio Risk Probability": results.portfolio.risk_prob * 100, "Portfolio VaR (95%)": results.portfolio.var_95, "Portfolio Sharpe Ratio": results.portfolio.sharpe_ratio },
        ...Object.entries(results.stocks).map(([ticker, stockResult]) => ({
          Ticker: ticker,
          "Mean NPV": stockResult.mean_npv,
          "Risk Probability": stockResult.risk_prob * 100,
          "VaR (95%)": stockResult.var_95,
          "Sharpe Ratio": stockResult.sharpe_ratio,
          "Predicted Annual Return": stockResult.predicted_mean_return * 252 * 100,
          "Historical Volatility": stockResult.historical_volatility * 100,
          Trend: stockResult.trend,
          "Sentiment Score": stockResult.sentiment_score * 100,
        })),
      ]
    : [];

  const createNpvChartData = (npvValues, label) => ({
    labels: npvValues.map((_, index) => `Trial ${index + 1}`),
    datasets: [
      {
        label: `${label} NPV Distribution (€)`,
        data: npvValues,
        backgroundColor: 'rgba(30, 58, 138, 0.6)',
        borderColor: 'rgba(30, 58, 138, 1)',
        borderWidth: 1,
      },
    ],
  });

  const createCumulativeProbChartData = (cumulativeProb) => ({
    labels: cumulativeProb.map(([npv]) => npv),
    datasets: [
      {
        label: 'Cumulative Probability',
        data: cumulativeProb.map(([_, prob]) => prob),
        borderColor: 'rgba(30, 58, 138, 1)',
        backgroundColor: 'rgba(30, 58, 138, 0.2)',
        fill: true,
        tension: 0.1,
      },
    ],
  });

  const createRiskReturnScatterData = (stocks) => ({
    datasets: Object.entries(stocks).map(([ticker, result]) => ({
      label: ticker,
      data: [{
        x: result.historical_volatility * 100,
        y: result.predicted_mean_return * 252 * 100,
      }],
      backgroundColor: 'rgba(30, 58, 138, 0.6)',
    })),
  });

  const createPriceTrendChartData = (prices, label) => ({
    labels: Array.from({ length: prices.length }, (_, i) => i),
    datasets: [
      {
        label: `${label} Price (€)`,
        data: prices,
        borderColor: 'rgba(30, 58, 138, 1)',
        backgroundColor: 'rgba(30, 58, 138, 0.2)',
        fill: false,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'NPV Distribution' },
      tooltip: { enabled: true },
    },
    scales: {
      x: { display: false },
      y: { title: { display: true, text: 'NPV (€)' } },
    },
  };

  const cumulativeChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Cumulative Probability of NPV' },
    },
    scales: {
      x: { title: { display: true, text: 'NPV (€)' } },
      y: { title: { display: true, text: 'Probability' }, min: 0, max: 1 },
    },
  };

  const scatterChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Risk vs Return' },
    },
    scales: {
      x: { title: { display: true, text: 'Volatility (%)' } },
      y: { title: { display: true, text: 'Predicted Annual Return (%)' } },
    },
  };

  const priceTrendChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Historical Price Trend' },
    },
    scales: {
      x: { title: { display: true, text: 'Days (Last 100)' } },
      y: { title: { display: true, text: 'Price (€)' } },
    },
  };

  return (
    <motion.div
      className="simulation-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <section className="input-section">
        <h2>Run a Simulation</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Initial Investment (€):</label>
            <input
              type="number"
              name="initialInvestment"
              value={formData.initialInvestment}
              onChange={handleFormChange}
              required
              title="Enter the initial amount you plan to invest (e.g., 1000000 for €1M)"
            />
          </div>
          <div className="form-group">
            <label>Time Horizon (Years):</label>
            <input
              type="number"
              name="years"
              value={formData.years}
              onChange={handleFormChange}
              required
              title="Enter the number of years for the investment (e.g., 5)"
            />
          </div>
          <div className="form-group">
            <label>Discount Rate (%):</label>
            <input
              type="number"
              step="0.01"
              name="discountRate"
              value={formData.discountRate}
              onChange={handleFormChange}
              required
              title="Enter the discount rate as a decimal (e.g., 0.05 for 5%)"
            />
          </div>
          <div className="form-group">
            <label>Portfolio Composition:</label>
            {selectedStocks.map((stock, index) => (
              <div key={index} className="stock-input">
                <select
                  value={stock}
                  onChange={(e) => handleStockChange(index, e.target.value)}
                >
                  {popularStocks.map((ticker) => (
                    <option key={ticker} value={ticker}>{ticker}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={weights[index]}
                  onChange={(e) => handleWeightChange(index, e.target.value)}
                  placeholder="Weight"
                  required
                />
                <button type="button" onClick={() => removeStock(index)} disabled={selectedStocks.length === 1}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addStock}>Add Stock</button>
            {weightError && <p className="error">{weightError}</p>}
          </div>
          <button type="submit" disabled={loading || weightError}>
            {loading ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </form>
      </section>

      <section className="results-section" id="results-section">
        {error && <p className="error">{error}</p>}
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="export-buttons">
              <button onClick={exportToPDF}>Export to PDF</button>
              <CSVLink data={csvData} filename="simulation-results.csv">
                Export to CSV
              </CSVLink>
            </div>
            <h2>Portfolio Results</h2>
            <div className="stats">
              <p>
                <strong>Mean NPV:</strong> €{results.portfolio.mean_npv.toFixed(2)}{' '}
                <span className="help-icon" data-tooltip-id="mean-npv">ℹ️</span>
                <ReactTooltip id="mean-npv" place="top" effect="solid">
                  The average Net Present Value of the portfolio across all simulations.
                </ReactTooltip>
              </p>
              <p>
                <strong>Risk Probability:</strong>{' '}
                <span
                  className={
                    results.portfolio.risk_prob < 0.3
                      ? 'risk-low'
                      : results.portfolio.risk_prob < 0.6
                      ? 'risk-medium'
                      : 'risk-high'
                  }
                >
                  {(results.portfolio.risk_prob * 100).toFixed(2)}%
                </span>{' '}
                <span className="help-icon" data-tooltip-id="risk-prob">ℹ️</span>
                <ReactTooltip id="risk-prob" place="top" effect="solid">
                  The probability of a negative NPV (i.e., losing money).
                </ReactTooltip>
              </p>
              <p>
                <strong>Value at Risk (95%):</strong> €{results.portfolio.var_95.toFixed(2)}{' '}
                <span className="help-icon" data-tooltip-id="var">ℹ️</span>
                <ReactTooltip id="var" place="top" effect="solid">
                  The maximum potential loss at 95% confidence level.
                </ReactTooltip>
              </p>
              <p>
                <strong>Sharpe Ratio:</strong> {results.portfolio.sharpe_ratio.toFixed(2)}{' '}
                <span className="help-icon" data-tooltip-id="sharpe">ℹ️</span>
                <ReactTooltip id="sharpe" place="top" effect="solid">
                  A measure of risk-adjusted return (higher is better).
                </ReactTooltip>
              </p>
              <p>
                <strong>Recommendation:</strong>{' '}
                {results.portfolio.risk_prob < 0.3
                  ? 'Low Risk: Proceed'
                  : results.portfolio.risk_prob < 0.6
                  ? 'Moderate Risk: Review'
                  : 'High Risk: Reconsider'}
              </p>
            </div>
            <div className="chart-container">
              <h3>Portfolio NPV Distribution</h3>
              <Bar
                data={createNpvChartData(results.portfolio.npv_values, 'Portfolio')}
                options={chartOptions}
              />
            </div>
            <div className="chart-container">
              <h3>Cumulative Probability of NPV</h3>
              <Line
                data={createCumulativeProbChartData(results.portfolio.cumulative_prob)}
                options={cumulativeChartOptions}
              />
            </div>

            <h2>Individual Stock Results</h2>
            <div className="chart-container">
              <h3>Risk vs Return (All Stocks)</h3>
              <Scatter
                data={createRiskReturnScatterData(results.stocks)}
                options={scatterChartOptions}
              />
            </div>
            {Object.entries(results.stocks).map(([ticker, stockResult]) => (
              <div key={ticker} className="stock-result">
                <h3>{ticker}</h3>
                <div className="stats">
                  <p><strong>Mean NPV:</strong> €{stockResult.mean_npv.toFixed(2)}</p>
                  <p>
                    <strong>Risk Probability:</strong>{' '}
                    <span
                      className={
                        stockResult.risk_prob < 0.3
                          ? 'risk-low'
                          : stockResult.risk_prob < 0.6
                          ? 'risk-medium'
                          : 'risk-high'
                      }
                    >
                      {(stockResult.risk_prob * 100).toFixed(2)}%
                    </span>
                  </p>
                  <p><strong>Value at Risk (95%):</strong> €{stockResult.var_95.toFixed(2)}</p>
                  <p><strong>Sharpe Ratio:</strong> {stockResult.sharpe_ratio.toFixed(2)}</p>
                  <p>
                    <strong>Predicted Annual Return:</strong>{' '}
                    {(stockResult.predicted_mean_return * 252 * 100).toFixed(2)}%{' '}
                    (95% CI: {(stockResult.ci_lower * 252 * 100).toFixed(2)}% to{' '}
                    {(stockResult.ci_upper * 252 * 100).toFixed(2)}%)
                  </p>
                  <p>
                    <strong>Historical Volatility:</strong>{' '}
                    {(stockResult.historical_volatility * 100).toFixed(2)}%
                  </p>
                  <p>
                    <strong>Trend (MA10 vs MA50):</strong> {stockResult.trend}
                  </p>
                  <p>
                    <strong>Sentiment Score:</strong>{' '}
                    {(stockResult.sentiment_score * 100).toFixed(2)}%{' '}
                    ({stockResult.sentiment_score > 0 ? 'Positive' : 'Negative'})
                  </p>
                </div>
                <div className="chart-container">
                  <h4>{ticker} NPV Distribution</h4>
                  <Bar
                    data={createNpvChartData(stockResult.npv_values, ticker)}
                    options={chartOptions}
                  />
                </div>
                <div className="chart-container">
                  <h4>{ticker} Historical Price Trend</h4>
                  <Line
                    data={createPriceTrendChartData(stockResult.historical_prices, ticker)}
                    options={priceTrendChartOptions}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </section>
    </motion.div>
  );
};

export default Simulation;