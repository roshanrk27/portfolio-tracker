# 📈 Stocks and NPS Extension Tasks

### 1. Create 'stocks' table in Supabase
Define schema with user_id, stock_code, quantity, purchase_date

### 2. Build StockForm to input stock details
Form for adding/editing stock_code, quantity, purchase_date

### 3. Insert stock entries to Supabase
Use Supabase client to write form data to 'stocks' table

### 4. Set up server function to fetch stock prices from Google Finance API
Use a backend API or scraping utility to get real-time stock prices

### 5. Calculate current stock value
Multiply latest stock price by quantity for each stock entry

### 6. Store or cache latest stock prices
Optional: use a 'stock_prices' table or cache in memory per session

### 7. Add file upload form creating table with NPS fund name to code mapping in admin dashboard
Add to admin dashboard tab with input csv for file upload. Upsert data with nps fund code as unique constraint

### 8. In NPS page add NPS holdings by selecting from the fund list
For each fund enter current unit holding and updated date

### 9. Fetch latest NAV for NPS schemes
Scrape or query current NAV for central/state tier from official source

### 10. Compute NPS total current value
Multiply units by NAV for each scheme and sum it up

### 11. Add 'NPS' card in dashboard and show current value
Create tab or section for NPS overview

### 12. Create card view for total stock value
Sum and display current stock portfolio value

### 13. Create card view for NPS value
Sum and display current NPS investment value

### 14. Update goal_scheme_mapping to include source type
Add enum field to indicate 'mutual_fund', 'stock', or 'nps'

### 15. UI to map stock or NPS to goals
Add dropdowns to select stocks/NPS per goal card

### 16. Store mapping and display in goal cards
Fetch mapping from DB and display associated stock/NPS value

### 17. Exclude stocks/NPS from XIRR calculation
Filter out non-mutual-fund investments in XIRR computation

### 18. Sum total goal value across MF + stock + NPS
Add up values for all investment types per goal

### 19. Test and validate multi-source investment view
Test combined rendering of goal cards with correct breakdown

### 20. Add visual breakdown in goal card
Use pie/bar chart to show MF vs stock vs NPS split

### 21. Add error handling for stock price fetch
Gracefully handle invalid stock codes or API downtime
