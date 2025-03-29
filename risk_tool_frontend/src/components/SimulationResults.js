import React from 'react';

const SimulationResults = ({ results }) => {
  if (!results) return null;

  const { portfolio, stocks } = results;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Simulation Results</h2>

      {/* Portfolio-level results */}
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h3 className="text-xl font-semibold mb-2">Portfolio Overview</h3>
        <p>Mean NPV: €{portfolio.mean_npv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p>Risk Probability: {(portfolio.risk_prob * 100).toFixed(2)}%</p>
        <p>Value at Risk (95%): €{portfolio.var_95.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p>Sharpe Ratio: {portfolio.sharpe_ratio.toFixed(2)}</p>
      </div>

      {/* Stock-level results with news */}
      {Object.entries(stocks).map(([ticker, stockData]) => (
        <div key={ticker} className="mb-8 p-4 bg-white shadow rounded">
          <h3 className="text-xl font-semibold mb-2">{ticker}</h3>
          <p>Mean NPV: €{stockData.mean_npv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p>Risk Probability: {(stockData.risk_prob * 100).toFixed(2)}%</p>
          <p>Value at Risk (95%): €{stockData.var_95.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p>Sharpe Ratio: {stockData.sharpe_ratio.toFixed(2)}</p>
          <p>Sentiment Score: {stockData.sentiment_score.toFixed(2)}</p>
          <p>Trend: {stockData.trend}</p>

          {/* News Articles Section */}
          <div className="mt-4">
            <h4 className="text-lg font-medium mb-2">Recent News for {ticker}</h4>
            {stockData.news_articles && stockData.news_articles.length > 0 ? (
              <ul className="space-y-4">
                {stockData.news_articles.map((article, index) => (
                  <li key={index} className="border-b pb-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {article.title}
                    </a>
                    <p className="text-sm text-gray-500">
                      {article.source} - {new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-gray-700">{article.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No recent news available for {ticker}.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SimulationResults;