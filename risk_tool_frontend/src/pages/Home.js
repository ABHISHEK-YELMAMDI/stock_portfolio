import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuickStartModal from '../components/QuickStartModal';

const Home = () => {
  const [articles, setArticles] = useState([]);
  const [stockNews, setStockNews] = useState([]); // New state for stock news
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate(); // Use navigate for routing

  useEffect(() => {
    const hasSeenModal = localStorage.getItem('hasSeenModal');
    if (!hasSeenModal) {
      setShowModal(true);
      localStorage.setItem('hasSeenModal', 'true');
    }

    // Fetch articles from the backend API
    const fetchArticles = async () => {
      try {
        const response = await axios.get('/api/articles'); // Adjust the endpoint as necessary
        setArticles(response.data);
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
    };

    // Fetch stock news from the backend API
    const fetchStockNews = async () => {
      try {
        const response = await axios.get('/api/stock-news'); // Adjust the endpoint as necessary
        setStockNews(response.data);
      } catch (error) {
        console.error('Error fetching stock news:', error);
      }
    };

    fetchArticles();
    fetchStockNews();
  }, []);

  return (
    <div className="home">
      {showModal && <QuickStartModal onClose={() => setShowModal(false)} />}
      <motion.section
        className="hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <h1>Make Smarter Investment Decisions with RiskWise</h1>
        <p>Analyze financial risk for your portfolio using advanced simulations and predictive analytics.</p>
        <Link to="/simulation" className="cta-button">Start Simulation</Link>
      </motion.section>

      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <motion.div
            className="step"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h3>1. Input Your Portfolio</h3>
            <p>Enter your investment amount, select stocks, and assign weights.</p>
          </motion.div>
          <motion.div
            className="step"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3>2. Run Simulations</h3>
            <p>Use Monte Carlo Simulations to model thousands of scenarios.</p>
          </motion.div>
          <motion.div
            className="step"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h3>3. Analyze Results</h3>
            <p>View detailed metrics, visualizations, and recommendations.</p>
          </motion.div>
        </div>
      </section>

      <section className="articles" onClick={() => navigate('/simulation-results', { state: { stockNews } })}>
        <h2>Latest Articles</h2>
        <ul>
          {articles.map((article, index) => (
            <li key={index}>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
              <a href={article.url} target="_blank" rel="noopener noreferrer">Read more</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="features">
        <h2>Why Choose RiskWise?</h2>
        <div className="feature-list">
          <motion.div
            className="feature"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h3>Multi-Stock Analysis</h3>
            <p>Analyze a portfolio of multiple stocks with real-time data.</p>
          </motion.div>
          <motion.div
            className="feature"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Advanced Predictions</h3>
            <p>Leverage ARIMA models and sentiment analysis for accurate forecasts.</p>
          </motion.div>
          <motion.div
            className="feature"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h3>Interactive Visualizations</h3>
            <p>Explore NPV distributions, risk-return scatter plots, and more.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
