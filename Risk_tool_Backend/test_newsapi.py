from newsapi import NewsApiClient
from textblob import TextBlob

# Your real NewsAPI key
NEWS_API_KEY = "a7dcf670c4d94b7abb15360e55a97c17"  # Replace with your actual key

# Initialize NewsAPI client
newsapi = NewsApiClient(api_key=NEWS_API_KEY)

# Test fetching news for a stock (e.g., AAPL)
ticker = "AAPL"
try:
    articles = newsapi.get_everything(q=ticker, language='en', sort_by='relevancy', page_size=10)
    if articles['articles']:
        print(f"Found {len(articles['articles'])} articles for {ticker}:")
        sentiment_score = 0
        for article in articles['articles']:
            text = article['title'] + " " + (article['description'] or "")
            print(f"Article: {text[:100]}...")  # Print first 100 characters of the article
            analysis = TextBlob(text)
            sentiment_score += analysis.sentiment.polarity
        sentiment_score /= len(articles['articles'])
        print(f"Average Sentiment Score for {ticker}: {sentiment_score}")
        sentiment_adjustment = 1 + (sentiment_score * 0.1)
        print(f"Sentiment Adjustment: {sentiment_adjustment}")
    else:
        print(f"No articles found for {ticker}.")
except Exception as e:
    print(f"Error fetching news: {str(e)}")