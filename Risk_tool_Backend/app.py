"""
Financial Risk Analysis Tool Backend
Endpoint: /api/simulate
Parameters:
  - initial_investment (float): Initial investment amount (default: 1000000)
  - years (int): Time horizon in years (default: 5)
  - discount_rate (float): Discount rate (default: 0.05)
Returns:
  - mean_npv (float): Mean Net Present Value
  - risk_prob (float): Probability of negative NPV
  - npv_values (list): Sample of 100 NPV outcomes for charts
  - predicted_mean_return (float): Predicted average return (for debugging)
"""

from flask import Flask, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
import yfinance as yf
import requests
from newsapi import NewsApiClient
import traceback
from textblob import TextBlob

app = Flask(__name__)
CORS(app)

FMP_API_KEY = "0ZZGmW9nWWQGlAwK4607M0HQo9kSO45u"
NEWS_API_KEY = "a7dcf670c4d94b7abb15360e55a97c17"

# Function to fetch news articles for a ticker (extracted for reuse)
def fetch_news_articles(ticker, newsapi):
    sentiment_score = 0
    news_articles = []
    try:
        articles = newsapi.get_everything(q=ticker, language='en', sort_by='relevancy', page_size=10)
        if articles['articles']:
            for article in articles['articles']:
                text = article['title'] + " " + (article['description'] or "")
                analysis = TextBlob(text)
                sentiment_score += analysis.sentiment.polarity
                if len(news_articles) < 3:
                    news_articles.append({
                        "title": article['title'] or "No title available",
                        "description": article['description'] or "No description available.",
                        "url": article['url'] or "#",
                        "source": article['source']['name'] if article['source'] and 'name' in article['source'] else "Unknown Source",
                        "publishedAt": article['publishedAt'] or "Unknown Date"
                    })
            sentiment_score /= len(articles['articles'])
        else:
            print(f"No articles found for {ticker}, defaulting to neutral sentiment.")
            sentiment_score = 0
    except Exception as e:
        print(f"Error fetching news for {ticker}: {str(e)}")
        sentiment_score = 0
    return news_articles, sentiment_score

# Existing /api/simulate endpoint (updated to use fetch_news_articles)
@app.route('/api/simulate', methods=['GET'])
def simulate():
    try:
        # Get parameters
        initial_investment = float(request.args.get('initial_investment', 1000000))
        years = int(request.args.get('years', 5))
        discount_rate = float(request.args.get('discount_rate', 0.05))
        tickers = request.args.get('tickers', 'AAPL,MSFT,TSLA').split(',')
        weights = [float(w) for w in request.args.get('weights', '0.33,0.33,0.34').split(',')]

        # Validate inputs
        if initial_investment <= 0:
            return {"error": "Initial investment must be positive"}, 400
        if years <= 0:
            return {"error": "Years must be positive"}, 400
        if discount_rate < 0:
            return {"error": "Discount rate cannot be negative"}, 400
        if len(tickers) != len(weights):
            return {"error": "Number of tickers must match number of weights"}, 400
        if abs(sum(weights) - 1.0) > 0.01:
            return {"error": "Weights must sum to 1"}, 400

        # Fetch historical data for each stock
        stock_data = {}
        for ticker in tickers:
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period="5y")
                if hist.empty:
                    raise ValueError("No data from yfinance")

                hist['Returns'] = hist['Close'].pct_change().dropna()
                returns = hist['Returns'].dropna().values

            except Exception as e:
                url = f"https://financialmodelingprep.com/api/v3/historical-price-full/{ticker}?apikey={FMP_API_KEY}"
                response = requests.get(url).json()
                if 'historical' not in response:
                    return {"error": f"Failed to fetch data for {ticker}"}, 500

                hist = pd.DataFrame(response['historical'])
                hist['Returns'] = hist['close'].pct_change().dropna()
                returns = hist['Returns'].dropna().values

            if len(returns) < 2:
                return {"error": f"Not enough data for {ticker}"}, 500

            stock_data[ticker] = returns

        # Predictive Analytics: Forecast future returns with ARIMA and sentiment
        newsapi = NewsApiClient(api_key=NEWS_API_KEY)
        predictions = {}
        for ticker, returns in stock_data.items():
            # ARIMA model for forecasting returns
            model = ARIMA(returns, order=(1, 1, 1))
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=years * 252)
            mean_predicted_return = float(np.mean(forecast))

            # Calculate standard error for confidence interval
            forecast_se = model_fit.get_forecast(steps=years * 252).se_mean
            ci_lower = mean_predicted_return - 1.96 * np.mean(forecast_se)
            ci_upper = mean_predicted_return + 1.96 * np.mean(forecast_se)

            # Calculate historical volatility
            hist_volatility = float(np.std(returns) * np.sqrt(252))

            # Calculate moving averages for trend analysis
            returns_series = pd.Series(returns)
            ma_short = float(returns_series.rolling(window=10).mean().iloc[-1])
            ma_long = float(returns_series.rolling(window=50).mean().iloc[-1])
            trend = "Bullish" if ma_short > ma_long else "Bearish"

            # Fetch news articles and sentiment
            news_articles, sentiment_score = fetch_news_articles(ticker, newsapi)
            sentiment_adjustment = 1 + (sentiment_score * 0.1)

            predictions[ticker] = {
                "mean_predicted_return": mean_predicted_return * sentiment_adjustment,
                "ci_lower": ci_lower * sentiment_adjustment,
                "ci_upper": ci_upper * sentiment_adjustment,
                "historical_volatility": hist_volatility,
                "trend": trend,
                "sentiment_score": sentiment_score,
                "news_articles": news_articles
            }

        # Monte Carlo Simulation for each stock
        num_trials = 1000
        np.random.seed(42)
        portfolio_npv = np.zeros(num_trials)
        stock_results = {}

        for ticker, returns in stock_data.items():
            mean_return = np.mean(returns)
            std_return = np.std(returns)
            predicted_return = predictions[ticker]["mean_predicted_return"]
            adjusted_mean_return = (mean_return + predicted_return) / 2
            annual_mean_return = adjusted_mean_return * 252
            annual_std_return = std_return * np.sqrt(252)

            annual_returns = np.random.normal(annual_mean_return, annual_std_return, (num_trials, years))
            stock_investment = initial_investment * weights[tickers.index(ticker)]
            cash_flows = stock_investment * annual_returns

            discount_factors = (1 + discount_rate) ** np.arange(1, years + 1)
            npv = -stock_investment + np.sum(cash_flows / discount_factors, axis=1)

            # Calculate VaR (95% confidence)
            var_95 = float(np.percentile(npv, 5))

            # Calculate Sharpe Ratio (assuming risk-free rate of 2%)
            risk_free_rate = 0.02
            expected_return = np.mean(npv) / stock_investment
            std_npv = np.std(npv) / stock_investment
            sharpe_ratio = (expected_return - risk_free_rate) / std_npv if std_npv != 0 else 0

            stock_results[ticker] = {
                "mean_npv": float(np.mean(npv)),
                "risk_prob": float(np.mean(npv < 0)),
                "npv_values": npv[:100].tolist(),
                "var_95": var_95,
                "sharpe_ratio": sharpe_ratio,
                "predicted_mean_return": predictions[ticker]["mean_predicted_return"],
                "ci_lower": predictions[ticker]["ci_lower"],
                "ci_upper": predictions[ticker]["ci_upper"],
                "historical_volatility": predictions[ticker]["historical_volatility"],
                "trend": predictions[ticker]["trend"],
                "sentiment_score": predictions[ticker]["sentiment_score"],
                "news_articles": predictions[ticker]["news_articles"],
                "historical_prices": hist['Close'].tail(100).tolist()
            }

            portfolio_npv += npv

        # Portfolio-level results
        portfolio_var_95 = float(np.percentile(portfolio_npv, 5))
        portfolio_expected_return = np.mean(portfolio_npv) / initial_investment
        portfolio_std_npv = np.std(portfolio_npv) / initial_investment
        portfolio_sharpe_ratio = (portfolio_expected_return - risk_free_rate) / portfolio_std_npv if portfolio_std_npv != 0 else 0

        portfolio_results = {
            "mean_npv": float(np.mean(portfolio_npv)),
            "risk_prob": float(np.mean(portfolio_npv < 0)),
            "npv_values": portfolio_npv[:100].tolist(),
            "var_95": portfolio_var_95,
            "sharpe_ratio": portfolio_sharpe_ratio,
            "cumulative_prob": [(i, float(np.mean(portfolio_npv <= i))) for i in np.linspace(min(portfolio_npv), max(portfolio_npv), 50)]
        }

        return {
            "portfolio": portfolio_results,
            "stocks": stock_results
        }

    except ValueError as e:
        return {"error": f"Invalid input: {str(e)}"}, 400
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Server error: {str(e)}"}, 500

# New endpoint to fetch news for a single stock
@app.route('/api/news', methods=['GET'])
def get_news():
    try:
        ticker = request.args.get('ticker')
        if not ticker:
            return {"error": "Ticker is required"}, 400

        newsapi = NewsApiClient(api_key=NEWS_API_KEY)
        news_articles, sentiment_score = fetch_news_articles(ticker, newsapi)

        return {
            "ticker": ticker,
            "news_articles": news_articles,
            "sentiment_score": sentiment_score
        }

    except Exception as e:
        return {"error": f"Failed to fetch news: {str(e)}"}, 500

if __name__ == "__main__":
    app.run(debug=True)