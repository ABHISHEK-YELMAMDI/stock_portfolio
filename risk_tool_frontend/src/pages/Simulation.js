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
  const [stockNews, setStockNews] = useState({});
  const [newsLoading, setNewsLoading] = useState({});
  const [stockSummaries, setStockSummaries] = useState({});
  const [showSummaryReport, setShowSummaryReport] = useState(false);

  useEffect(() => {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      setWeightError('Weights must sum to 1');
    } else {
      setWeightError('');
    }
  }, [weights]);

  useEffect(() => {
    const fetchNewsForStock = async (ticker, index) => {
      if (!ticker) return;

      setNewsLoading((prev) => ({ ...prev, [index]: true }));
      try {
        const response = await axios.get('http://127.0.0.1:5000/api/news', {
          params: { ticker },
        });
        const data = response.data;
        if (response.status === 200) {
          setStockNews((prev) => ({
            ...prev,
            [index]: {
              articles: data.news_articles,
              sentiment_score: data.sentiment_score,
            },
          }));
        } else {
          console.error(data.error || 'Failed to fetch news');
          setStockNews((prev) => ({
            ...prev,
            [index]: { articles: [], sentiment_score: 0 },
          }));
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setStockNews((prev) => ({
          ...prev,
          [index]: { articles: [], sentiment_score: 0 },
        }));
      } finally {
        setNewsLoading((prev) => ({ ...prev, [index]: false }));
      }
    };

    const fetchStockSummary = (ticker, index) => {
      const mockSummaries = {
        AAPL: { price: 175.32, change: 2.5 },
        MSFT: { price: 420.15, change: -1.2 },
        TSLA: { price: 250.80, change: 3.8 },
        GOOGL: { price: 145.90, change: 0.5 },
        AMZN: { price: 185.40, change: -0.8 },
        NVDA: { price: 620.75, change: 4.1 },
        META: { price: 510.20, change: 1.9 },
        JPM: { price: 195.60, change: -0.3 },
        WMT: { price: 165.25, change: 0.7 },
        DIS: { price: 115.80, change: -1.5 },
      };
      setStockSummaries((prev) => ({
        ...prev,
        [index]: mockSummaries[ticker] || { price: 0, change: 0 },
      }));
    };

    selectedStocks.forEach((stock, index) => {
      fetchNewsForStock(stock, index);
      fetchStockSummary(stock, index);
    });
  }, [selectedStocks]);

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
    setStockNews((prev) => {
      const newNews = { ...prev };
      delete newNews[index];
      return newNews;
    });
    setStockSummaries((prev) => {
      const newSummaries = { ...prev };
      delete newSummaries[index];
      return newSummaries;
    });
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

  const generateSummary = () => {
    if (!results) return { interpretations: [], suggestions: [] };

    const interpretations = [];
    const suggestions = [];

    // Portfolio-Level Interpretations
    const meanNpv = results.portfolio.mean_npv;
    const riskProb = results.portfolio.risk_prob * 100;
    const var95 = results.portfolio.var_95;
    const sharpeRatio = results.portfolio.sharpe_ratio;

    // NPV Distribution Interpretation
    const npvValues = results.portfolio.npv_values;
    const npvRange = `${Math.min(...npvValues).toFixed(2)} to ${Math.max(...npvValues).toFixed(2)}`;
    interpretations.push(
      `The Portfolio NPV Distribution shows a range of possible outcomes from €${npvRange}. The mean NPV is €${meanNpv.toFixed(2)}, indicating the expected value of your portfolio after ${formData.years} years.`
    );

    // Cumulative Probability Interpretation
    const breakEvenNpv = results.portfolio.cumulative_prob.find(([npv]) => npv >= 0)?.[1] || 0;
    interpretations.push(
      `The Cumulative Probability of NPV indicates a ${breakEvenNpv.toFixed(2) * 100}% chance of achieving a positive NPV, meaning there is a ${riskProb.toFixed(2)}% risk of a loss. At a 95% confidence level, the Value at Risk (VaR) is €${var95.toFixed(2)}, meaning you could lose up to this amount in the worst 5% of scenarios.`
    );

    // Risk vs Return Interpretation
    const stockRiskReturns = Object.entries(results.stocks).map(([ticker, result]) => ({
      ticker,
      risk: result.historical_volatility * 100,
      return: result.predicted_mean_return * 252 * 100,
    }));
    const highestRiskStock = stockRiskReturns.reduce((max, stock) => (stock.risk > max.risk ? stock : max), stockRiskReturns[0]);
    const highestReturnStock = stockRiskReturns.reduce((max, stock) => (stock.return > max.return ? stock : max), stockRiskReturns[0]);
    interpretations.push(
      `The Risk vs Return scatter plot shows that ${highestRiskStock.ticker} has the highest volatility (${highestRiskStock.risk.toFixed(2)}%), while ${highestReturnStock.ticker} offers the highest predicted annual return (${highestReturnStock.return.toFixed(2)}%).`
    );

    // Portfolio-Level Suggestions
    if (riskProb > 60) {
      suggestions.push(
        `High Risk Alert: Your portfolio has a ${riskProb.toFixed(2)}% chance of a negative NPV, with a potential loss of up to €${var95.toFixed(2)} (VaR 95%). Consider reducing exposure to high-risk stocks like ${highestRiskStock.ticker} or lowering your overall investment amount.`
      );
    } else if (riskProb > 30) {
      suggestions.push(
        `Moderate Risk: With a ${riskProb.toFixed(2)}% chance of a negative NPV and a potential loss of up to €${var95.toFixed(2)} (VaR 95%), review your portfolio composition. You might reduce the weight of ${highestRiskStock.ticker} (volatility: ${highestRiskStock.risk.toFixed(2)}%) or diversify further.`
      );
    } else {
      suggestions.push(
        `Low Risk: Your portfolio has a ${riskProb.toFixed(2)}% chance of a negative NPV, with a potential loss of up to €${var95.toFixed(2)} (VaR 95%). You can proceed with this composition, but monitor ${highestRiskStock.ticker} due to its high volatility (${highestRiskStock.risk.toFixed(2)}%).`
      );
    }

    if (sharpeRatio < 1) {
      suggestions.push(
        `Low Sharpe Ratio (${sharpeRatio.toFixed(2)}): Your portfolio's risk-adjusted return is suboptimal. Consider replacing underperforming stocks or adjusting weights to improve returns relative to risk.`
      );
    }

    // Individual Stock Suggestions
    Object.entries(results.stocks).forEach(([ticker, stockResult]) => {
      const stockRiskProb = stockResult.risk_prob * 100;
      const stockSharpe = stockResult.sharpe_ratio;
      if (stockRiskProb > 50) {
        suggestions.push(
          `${ticker} has a high risk of loss (${stockRiskProb.toFixed(2)}%). Consider reducing its weight or replacing it with a less volatile stock.`
        );
      }
      if (stockSharpe < 0.5) {
        suggestions.push(
          `${ticker} has a low Sharpe Ratio (${stockSharpe.toFixed(2)}), indicating poor risk-adjusted returns. You might replace it with a stock offering better returns for the same level of risk.`
        );
      }
    });

    // Sentiment-Based Suggestions
    selectedStocks.forEach((stock, index) => {
      if (stockNews[index]?.sentiment_score < 0) {
        suggestions.push(
          `${stock} has a negative sentiment score (${(stockNews[index].sentiment_score * 100).toFixed(2)}%). Recent news may indicate potential issues—review the news articles for more details.`
        );
      }
    });

    return { interpretations, suggestions };
  };

  // Updated Function: Generate Recommendation (Go/No-Go) with Straight Answer
  const generateRecommendation = () => {
    if (!results) return { decision: 'N/A', reason: 'No simulation results available.', investmentDecision: 'No simulation results available.' };

    const riskProb = results.portfolio.risk_prob * 100;
    const sharpeRatio = results.portfolio.sharpe_ratio;

    let decision = '';
    let reason = '';
    let investmentDecision = '';

    if (riskProb > 60 || sharpeRatio < 0.5) {
      decision = 'No-Go';
      reason = `High Risk and/or Poor Risk-Adjusted Returns: The portfolio has a ${riskProb.toFixed(2)}% chance of a negative NPV, and the Sharpe Ratio is ${sharpeRatio.toFixed(2)}, indicating suboptimal returns for the level of risk.`;
      investmentDecision = 'You should not invest in this portfolio.';
    } else if (riskProb > 30 || sharpeRatio < 1) {
      decision = 'Proceed with Caution';
      reason = `Moderate Risk: The portfolio has a ${riskProb.toFixed(2)}% chance of a negative NPV, and the Sharpe Ratio is ${sharpeRatio.toFixed(2)}, suggesting moderate risk-adjusted returns. Review the suggestions to optimize your portfolio.`;
      investmentDecision = 'You should proceed with caution if you choose to invest in this portfolio.';
    } else {
      decision = 'Go';
      reason = `Low Risk, Good Risk-Adjusted Returns: The portfolio has a ${riskProb.toFixed(2)}% chance of a negative NPV, and the Sharpe Ratio is ${sharpeRatio.toFixed(2)}, indicating a favorable risk-return profile.`;
      investmentDecision = 'You should invest in this portfolio.';
    }

    return { decision, reason, investmentDecision };
  };

  const exportToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yOffset = 10;

    // Title
    pdf.setFontSize(16);
    pdf.text('Financial Risk Analysis Report', pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 10;

    // Portfolio Results
    pdf.setFontSize(12);
    pdf.text('Portfolio Results', 10, yOffset);
    yOffset += 5;
    pdf.setFontSize(10);
    pdf.text(`Mean NPV: €${results.portfolio.mean_npv.toFixed(2)}`, 10, yOffset);
    yOffset += 5;
    pdf.text(`Risk Probability: ${(results.portfolio.risk_prob * 100).toFixed(2)}%`, 10, yOffset);
    yOffset += 5;
    pdf.text(`Value at Risk (95%): €${results.portfolio.var_95.toFixed(2)}`, 10, yOffset);
    yOffset += 5;
    pdf.text(`Sharpe Ratio: ${results.portfolio.sharpe_ratio.toFixed(2)}`, 10, yOffset);
    yOffset += 10;

    // Capture Charts
    const captureChart = async (elementId, title) => {
      const element = document.getElementById(elementId);
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 20;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      if (yOffset + imgHeight + 20 > pageHeight) {
        pdf.addPage();
        yOffset = 10;
      }

      pdf.setFontSize(12);
      pdf.text(title, 10, yOffset);
      yOffset += 5;
      pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
      yOffset += imgHeight + 10;
    };

    // Add Charts to PDF
    const chartPromises = [
      captureChart('portfolio-npv-chart', 'Portfolio NPV Distribution'),
      captureChart('cumulative-prob-chart', 'Cumulative Probability of NPV'),
      captureChart('risk-return-chart', 'Risk vs Return (All Stocks)'),
    ];

    Promise.all(chartPromises).then(() => {
      // Individual Stock Results
      Object.entries(results.stocks).forEach(([ticker, stockResult]) => {
        if (yOffset + 40 > pageHeight) {
          pdf.addPage();
          yOffset = 10;
        }

        pdf.setFontSize(12);
        pdf.text(`${ticker} Results`, 10, yOffset);
        yOffset += 5;
        pdf.setFontSize(10);
        pdf.text(`Mean NPV: €${stockResult.mean_npv.toFixed(2)}`, 10, yOffset);
        yOffset += 5;
        pdf.text(`Risk Probability: ${(stockResult.risk_prob * 100).toFixed(2)}%`, 10, yOffset);
        yOffset += 5;
        pdf.text(`Sharpe Ratio: ${stockResult.sharpe_ratio.toFixed(2)}`, 10, yOffset);
        yOffset += 10;
      });

      // Summary and Recommendations
      const { interpretations, suggestions } = generateSummary();
      if (yOffset + 40 > pageHeight) {
        pdf.addPage();
        yOffset = 10;
      }

      pdf.setFontSize(12);
      pdf.text('Summary and Recommendations', 10, yOffset);
      yOffset += 5;
      pdf.setFontSize(10);
      pdf.text('Interpretations:', 10, yOffset);
      yOffset += 5;
      interpretations.forEach((interpretation, index) => {
        if (yOffset + 10 > pageHeight) {
          pdf.addPage();
          yOffset = 10;
        }
        pdf.text(`${index + 1}. ${interpretation}`, 15, yOffset, { maxWidth: pageWidth - 30 });
        yOffset += pdf.splitTextToSize(interpretation, pageWidth - 30).length * 5 + 2;
      });

      yOffset += 5;
      pdf.text('Suggestions:', 10, yOffset);
      yOffset += 5;
      suggestions.forEach((suggestion, index) => {
        if (yOffset + 10 > pageHeight) {
          pdf.addPage();
          yOffset = 10;
        }
        pdf.text(`${index + 1}. ${suggestion}`, 15, yOffset, { maxWidth: pageWidth - 30 });
        yOffset += pdf.splitTextToSize(suggestion, pageWidth - 30).length * 5 + 2;
      });

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
        ...generateSummary().interpretations.map((interpretation, index) => ({
          "Interpretations": `Interpretation ${index + 1}: ${interpretation}`,
        })),
        ...generateSummary().suggestions.map((suggestion, index) => ({
          "Suggestions": `Suggestion ${index + 1}: ${suggestion}`,
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

  const stockColors = [
    'from-blue-500 to-blue-700',
    'from-green-500 to-green-700',
    'from-purple-500 to-purple-700',
    'from-pink-500 to-pink-700',
    'from-indigo-500 to-indigo-700',
  ];

  return (
    <motion.div
      className="simulation-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <section className="input-section">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Run a Simulation</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label className="block text-gray-700 font-medium mb-1">Initial Investment (€):</label>
            <input
              type="number"
              name="initialInvestment"
              value={formData.initialInvestment}
              onChange={handleFormChange}
              required
              title="Enter the initial amount you plan to invest (e.g., 1000000 for €1M)"
              className="border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="form-group mb-4">
            <label className="block text-gray-700 font-medium mb-1">Time Horizon (Years):</label>
            <input
              type="number"
              name="years"
              value={formData.years}
              onChange={handleFormChange}
              required
              title="Enter the number of years for the investment (e.g., 5)"
              className="border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="form-group mb-4">
            <label className="block text-gray-700 font-medium mb-1">Discount Rate (%):</label>
            <input
              type="number"
              step="0.01"
              name="discountRate"
              value={formData.discountRate}
              onChange={handleFormChange}
              required
              title="Enter the discount rate as a decimal (e.g., 0.05 for 5%)"
              className="border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="form-group mb-4">
            <label className="block text-gray-700 font-medium mb-2">Portfolio Composition:</label>
            {selectedStocks.map((stock, index) => (
              <motion.div
                key={index}
                className="stock-entry mb-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-start md:space-x-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`flex items-center p-2 rounded-lg bg-gradient-to-r ${stockColors[index % stockColors.length]} text-white shadow-md`}>
                        <select
                          value={stock}
                          onChange={(e) => handleStockChange(index, e.target.value)}
                          className="border border-gray-300 p-1 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
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
                          className="border border-gray-300 p-1 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-20 ml-2"
                        />
                        <button
                          type="button"
                          onClick={() => removeStock(index)}
                          disabled={selectedStocks.length === 1}
                          className="bg-red-600 text-white px-2 py-1 rounded ml-2 hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {stockSummaries[index] && (
                      <div className="flex items-center space-x-2 text-xs text-gray-700">
                        <span className="font-medium">Price: ${stockSummaries[index].price.toFixed(2)}</span>
                        <span className={`font-semibold ${stockSummaries[index].change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stockSummaries[index].change >= 0 ? '↑' : '↓'} {Math.abs(stockSummaries[index].change)}%
                        </span>
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          {stockNews[index]?.articles?.length || 0} News
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 mt-2 md:mt-0 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-lg shadow-sm">
                    <h4 className="text-xs font-semibold text-indigo-800 mb-1 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m6 13a2 2 0 01-2-2V9a2 2 0 012-2h1m-1 11h1a2 2 0 002-2v-1"></path>
                      </svg>
                      News for {stock}
                    </h4>
                    {newsLoading[index] ? (
                      <p className="text-gray-500 text-xs italic">Loading news...</p>
                    ) : stockNews[index] && stockNews[index].articles && stockNews[index].articles.length > 0 ? (
                      <motion.ul
                        className="space-y-1 max-h-24 overflow-y-auto"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, staggerChildren: 0.05 }}
                      >
                        {stockNews[index].articles.map((article, articleIndex) => (
                          <motion.li
                            key={articleIndex}
                            className="p-1 bg-white rounded-md shadow-sm hover:shadow-lg hover:bg-gradient-to-r hover:from-indigo-100 hover:to-blue-100 transition-all duration-200"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.03 }}
                            transition={{ duration: 0.1 }}
                          >
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline font-medium text-xs"
                            >
                              {article.title}
                            </a>
                            <p className="text-xs text-gray-600">
                              {article.source} • {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </motion.li>
                        ))}
                      </motion.ul>
                    ) : (
                      <p className="text-gray-500 text-xs italic">No recent news available for {stock}.</p>
                    )}
                    {stockNews[index] && (
                      <p className="text-xs mt-1 flex items-center">
                        <span className="font-medium text-gray-800 mr-1">Sentiment:</span>
                        <span className={`font-semibold ${stockNews[index].sentiment_score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(stockNews[index].sentiment_score * 100).toFixed(2)}%{' '}
                          ({stockNews[index].sentiment_score > 0 ? 'Positive' : 'Negative'})
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <button
              type="button"
              onClick={addStock}
              className="bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-2 rounded mt-2 hover:from-green-600 hover:to-green-800 transition-colors shadow-md"
            >
              Add Stock
            </button>
            {weightError && <p className="error text-red-500 mt-2">{weightError}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || weightError}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded disabled:bg-gray-400 hover:from-blue-600 hover:to-blue-800 transition-colors mt-4 shadow-md"
          >
            {loading ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </form>
      </section>

      <section className="results-section" id="results-section">
        {error && <p className="error text-red-500">{error}</p>}
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="export-buttons mb-4">
              <button
                onClick={exportToPDF}
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded hover:from-blue-600 hover:to-blue-800 transition-colors mr-2 shadow-md"
              >
                Export to PDF
              </button>
              <CSVLink
                data={csvData}
                filename="simulation-results.csv"
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded hover:from-blue-600 hover:to-blue-800 transition-colors mr-2 shadow-md"
              >
                Export to CSV
              </CSVLink>
              <button
                onClick={() => setShowSummaryReport(!showSummaryReport)}
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded hover:from-blue-600 hover:to-blue-800 transition-colors shadow-md"
              >
                {showSummaryReport ? 'Hide Summary Report' : 'View Summary Report'}
              </button>
            </div>

            {/* Conditional Rendering: Show Results or Summary Report */}
            {!showSummaryReport ? (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Portfolio Results</h2>
                <div className="stats bg-white p-4 rounded-lg shadow-sm mb-4">
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
                <div className="chart-container mb-4" id="portfolio-npv-chart">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Portfolio NPV Distribution</h3>
                  <Bar
                    data={createNpvChartData(results.portfolio.npv_values, 'Portfolio')}
                    options={chartOptions}
                  />
                </div>
                <div className="chart-container mb-4" id="cumulative-prob-chart">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Cumulative Probability of NPV</h3>
                  <Line
                    data={createCumulativeProbChartData(results.portfolio.cumulative_prob)}
                    options={cumulativeChartOptions}
                  />
                </div>

                <h2 className="text-xl font-bold text-gray-800 mb-4">Individual Stock Results</h2>
                <div className="chart-container mb-4" id="risk-return-chart">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Risk vs Return (All Stocks)</h3>
                  <Scatter
                    data={createRiskReturnScatterData(results.stocks)}
                    options={scatterChartOptions}
                  />
                </div>
                {Object.entries(results.stocks).map(([ticker, stockResult]) => (
                  <div key={ticker} className="stock-result mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{ticker}</h3>
                    <div className="stats bg-white p-4 rounded-lg shadow-sm mb-4">
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
                    <div className="chart-container mb-4">
                      <h4 className="text-md font-semibold text-gray-800 mb-2">{ticker} NPV Distribution</h4>
                      <Bar
                        data={createNpvChartData(stockResult.npv_values, ticker)}
                        options={chartOptions}
                      />
                    </div>
                    <div className="chart-container mb-4">
                      <h4 className="text-md font-semibold text-gray-800 mb-2">{ticker} Historical Price Trend</h4>
                      <Line
                        data={createPriceTrendChartData(stockResult.historical_prices, ticker)}
                        options={priceTrendChartOptions}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="detailed-summary-report bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Portfolio Summary Report</h2>

                {/* Straight Answer */}
                <div className="mb-4">
                  <p
                    className={`text-lg font-semibold ${
                      generateRecommendation().decision === 'Go'
                        ? 'text-green-600'
                        : generateRecommendation().decision === 'Proceed with Caution'
                        ? 'text-orange-600'
                        : 'text-red-600'
                    }`}
                  >
                    {generateRecommendation().investmentDecision}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Recommendation</h3>
                  <p>
                    <strong>Decision:</strong>{' '}
                    <span
                      className={
                        generateRecommendation().decision === 'Go'
                          ? 'text-green-600'
                          : generateRecommendation().decision === 'Proceed with Caution'
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }
                    >
                      {generateRecommendation().decision}
                    </span>
                  </p>
                  <p className="text-gray-700 mt-1">
                    <strong>Reason:</strong> {generateRecommendation().reason}
                  </p>
                </div>

                {/* Summary and Recommendations */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Summary and Recommendations</h3>
                  <div className="mb-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-1">Interpretations</h4>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      {generateSummary().interpretations.map((interpretation, index) => (
                        <li key={index}>{interpretation}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-1">Suggestions</h4>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      {generateSummary().suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Theoretical Explanations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Theoretical Explanations</h3>
                  <div className="space-y-4 text-gray-700">
                    <div>
                      <h4 className="text-md font-semibold text-gray-800">Mean NPV (Net Present Value)</h4>
                      <p>
                        The Mean NPV represents the average expected value of your portfolio after accounting for the time value of money over the specified time horizon ({formData.years} years). It is calculated by discounting future cash flows back to their present value using the discount rate ({(formData.discountRate * 100).toFixed(2)}%). A positive Mean NPV (€{results.portfolio.mean_npv.toFixed(2)}) suggests that, on average, the portfolio is expected to generate value above the initial investment, while a negative value would indicate a loss.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-800">Risk Probability</h4>
                      <p>
                        The Risk Probability ({(results.portfolio.risk_prob * 100).toFixed(2)}%) is the likelihood that the portfolio’s NPV will be negative, meaning you could lose money. It is derived from the Monte Carlo simulation, which runs thousands of scenarios to model potential outcomes based on historical volatility and predicted returns. A high risk probability indicates a greater chance of loss, which influenced the recommendation by assessing the overall safety of the investment.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-800">Value at Risk (VaR) at 95%</h4>
                      <p>
                        The Value at Risk (VaR) at 95% (€{results.portfolio.var_95.toFixed(2)}) quantifies the maximum potential loss you might face in the worst 5% of scenarios. It is a statistical measure used to assess the downside risk of the portfolio. A high VaR indicates significant potential losses, which can impact the recommendation by highlighting the worst-case scenario you might encounter.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-800">Sharpe Ratio</h4>
                      <p>
                        The Sharpe Ratio ({results.portfolio.sharpe_ratio.toFixed(2)}) measures the risk-adjusted return of the portfolio. It is calculated as the portfolio’s excess return (above the risk-free rate) divided by its standard deviation of returns. A higher Sharpe Ratio indicates better returns for the level of risk taken. A low Sharpe Ratio, as seen in your portfolio, suggests that the returns may not justify the risk, influencing the recommendation to proceed with caution or reconsider the portfolio composition.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-800">How These Metrics Influenced the Recommendation</h4>
                      <p>
                        The recommendation ({generateRecommendation().decision}) was determined by evaluating the Risk Probability and Sharpe Ratio. A Risk Probability above 60% or a Sharpe Ratio below 0.5 indicates a high-risk portfolio with poor risk-adjusted returns, leading to a "No-Go" decision. A Risk Probability between 30% and 60% or a Sharpe Ratio between 0.5 and 1 suggests moderate risk, resulting in a "Proceed with Caution" recommendation. A Risk Probability below 30% and a Sharpe Ratio above 1 indicates a low-risk, high-return portfolio, justifying a "Go" decision. The VaR and Mean NPV provide additional context on potential losses and expected gains, respectively, to support this decision.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </section>
    </motion.div>
  );
};

export default Simulation;