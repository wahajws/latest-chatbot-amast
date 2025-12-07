# Challenging Questions for AMAST Database Chatbot

Based on the database schema analysis and AMAST Sales Manual, here are challenging questions to test the chatbot's capabilities.

## Category 1: Revenue & Sales Analysis

### Basic Revenue Questions
1. **"What was the total revenue last month?"**
   - Tests: Year partitioning, date filtering, aggregation
   - Expected: Should use invoices_y2024 or invoices_y2025 based on current date

2. **"Compare the revenue for Q1 2024 vs Q1 2025"**
   - Tests: Multiple year tables, UNION, comparison
   - Expected: Should query both invoices_y2024 and invoices_y2025, aggregate by quarter

3. **"What is the revenue growth rate from last year to this year?"**
   - Tests: Year-over-year calculation, percentage calculation
   - Expected: Compare 2024 total vs 2025 total, calculate percentage change

4. **"Show me the revenue breakdown by month for the last 6 months"**
   - Tests: Monthly aggregation, date range spanning multiple months
   - Expected: GROUP BY month, filter last 6 months

### Advanced Revenue Questions
5. **"What is the average invoice value this year compared to last year?"**
   - Tests: AVG calculation, year comparison, multiple tables
   - Expected: Calculate AVG(total_amount) for both years

6. **"Which month had the highest revenue in 2024?"**
   - Tests: MAX aggregation, GROUP BY month, year filtering
   - Expected: Aggregate by month, find MAX

7. **"What percentage of total revenue came from the top 10 outlets?"**
   - Tests: Subquery, percentage calculation, ranking
   - Expected: Calculate top 10 outlet revenue, divide by total revenue

## Category 2: Outlet & Customer Analysis

### Outlet Performance
8. **"Show me the top 20 outlets by total sales this year"**
   - Tests: JOIN outlets with invoices, aggregation, ranking
   - Expected: JOIN outlets and invoices_y2025, SUM by outlet, ORDER BY DESC, LIMIT 20

9. **"Which outlets have not received any delivery orders in the last 30 days?"**
   - Tests: LEFT JOIN, NULL check, date filtering
   - Expected: LEFT JOIN outlets with delivery_orders, WHERE order_date < 30 days ago AND order_id IS NULL

10. **"What is the average number of invoices per outlet this month?"**
    - Tests: COUNT, AVG, GROUP BY, date filtering
    - Expected: COUNT invoices per outlet, then AVG of those counts

11. **"Show me outlets with sales above the average outlet sales"**
    - Tests: Subquery with AVG, comparison
    - Expected: Calculate average sales, then filter outlets above that

### Customer Relationships
12. **"How many active outlets do we have? (outlets with invoices in the last 90 days)"**
    - Tests: Date filtering, DISTINCT count, activity definition
    - Expected: COUNT DISTINCT outlet_id WHERE invoice_date >= 90 days ago

13. **"What is the customer retention rate? (outlets that ordered both last month and this month)"**
    - Tests: Complex date logic, self-join or subquery
    - Expected: Find outlets with invoices in both months

## Category 3: Inventory & Stock Management

### Stock Analysis
14. **"What is the current stock level across all sites?"**
    - Tests: inventory_daily_snapshot or inventory_ledger, latest date
    - Expected: Get latest snapshot date, SUM quantities

15. **"Show me products with stock levels below 100 units"**
    - Tests: WHERE clause, inventory tables
    - Expected: Filter inventory where quantity < 100

16. **"What is the stock movement (in vs out) for the last week?"**
    - Tests: inventory_ledger, transaction types, date filtering
    - Expected: SUM quantities by transaction type, filter last week

17. **"Which SKUs have the highest stock value? (quantity * price)"**
    - Tests: JOIN inventory with price_list, calculation
    - Expected: JOIN tables, calculate value, ORDER BY DESC

### Van Stock
18. **"What is the total stock value in all vans?"**
    - Tests: van_stock_ledger, aggregation, large table handling
    - Expected: SUM stock quantities, JOIN with price data if needed

19. **"Show me vans with stock levels above 10,000 units"**
    - Tests: van_stock_ledger, GROUP BY van, HAVING
    - Expected: GROUP BY van_id, SUM quantities, HAVING > 10000

20. **"What is the average stock per van?"**
    - Tests: van_stock_ledger, AVG, GROUP BY
    - Expected: AVG stock quantities per van

## Category 4: Delivery Orders & Logistics

### Order Analysis
21. **"How many delivery orders were created last week?"**
    - Tests: delivery_orders, date filtering
    - Expected: COUNT WHERE created_at in last week

22. **"What is the average delivery order value?"**
    - Tests: delivery_orders or delivery_order_details, AVG
    - Expected: AVG of order totals

23. **"Show me delivery orders that are still pending (not completed)"**
    - Tests: delivery_orders, status filtering
    - Expected: Filter by status column (need to know status values)

24. **"What is the total quantity delivered this month?"**
    - Tests: delivery_order_details, SUM, date filtering
    - Expected: SUM quantities from delivery_order_details, JOIN with delivery_orders for date

25. **"Which outlets have the most delivery orders this year?"**
    - Tests: delivery_orders, COUNT, GROUP BY, year filtering
    - Expected: COUNT delivery orders per outlet, ORDER BY DESC

### Order Details
26. **"Show me the top 10 products by delivery quantity this month"**
    - Tests: delivery_order_details, JOIN with products/SKUs, aggregation
    - Expected: SUM quantities, GROUP BY product, ORDER BY DESC, LIMIT 10

27. **"What is the average items per delivery order?"**
    - Tests: delivery_order_details, COUNT items per order, AVG
    - Expected: COUNT items per order_id, then AVG

## Category 5: Year Partitioning & Complex Queries

### Multi-Year Analysis
28. **"Compare total sales across all years (2021, 2022, 2023, 2024, 2025)"**
    - Tests: UNION across multiple year tables
    - Expected: UNION ALL from invoices_y2021 through invoices_y2025

29. **"What is the year-over-year growth for each year?"**
    - Tests: Multiple year tables, percentage calculation, window functions
    - Expected: Calculate growth rate between consecutive years

30. **"Show me the monthly sales trend for the last 2 years"**
    - Tests: UNION, GROUP BY year and month, date formatting
    - Expected: UNION 2024 and 2025 data, GROUP BY year, month

### Complex Aggregations
31. **"What is the revenue per outlet per month for the last quarter?"**
    - Tests: Multiple aggregations, date range, JOIN
    - Expected: JOIN outlets with invoices, GROUP BY outlet and month

32. **"Show me the top 5 products by revenue for each month this year"**
    - Tests: Window functions or subquery, ranking per month
    - Expected: RANK() OVER (PARTITION BY month), filter top 5

## Category 6: RMO (Regional Management Office) Analysis

33. **"What is the total revenue by RMO this year?"**
    - Tests: JOIN rmos with invoices, aggregation
    - Expected: JOIN rmos table with invoices, SUM by RMO

34. **"Which RMO has the highest number of outlets?"**
    - Tests: JOIN rmos with outlets, COUNT
    - Expected: COUNT outlets per RMO, ORDER BY DESC

35. **"Show me RMO performance comparison (revenue, number of orders, number of outlets)"**
    - Tests: Multiple aggregations, multiple JOINs
    - Expected: Multiple metrics per RMO in one query

## Category 7: Invoice & Payment Analysis

### Invoice Details
36. **"What is the average number of line items per invoice?"**
    - Tests: invoice_details, COUNT per invoice, AVG
    - Expected: COUNT items per invoice_id, then AVG

37. **"Show me invoices with more than 20 line items"**
    - Tests: invoice_details, GROUP BY, HAVING
    - Expected: COUNT items per invoice, HAVING > 20

38. **"What is the total revenue by product category?"**
    - Tests: invoice_details, JOIN with products, aggregation
    - Expected: JOIN invoice_details with products/SKUs, SUM by category

39. **"Which products appear in the most invoices?"**
    - Tests: invoice_details, COUNT DISTINCT invoice_id per product
    - Expected: COUNT DISTINCT invoice_id per sku_id, ORDER BY DESC

### Payment Analysis
40. **"What is the outstanding invoice amount? (invoices not yet paid)"**
    - Tests: invoices, status filtering, SUM
    - Expected: SUM total_amount WHERE status != 'paid' (need to know status values)

## Category 8: Time-Series & Trends

41. **"Show me the daily sales trend for the last 30 days"**
    - Tests: Daily aggregation, date range, time series
    - Expected: GROUP BY date, filter last 30 days

42. **"What day of the week has the highest sales?"**
    - Tests: Date functions (EXTRACT DOW), aggregation
    - Expected: EXTRACT(DOW FROM date), GROUP BY, ORDER BY DESC

43. **"Show me the sales growth rate month-over-month for this year"**
    - Tests: Window functions, percentage calculation
    - Expected: LAG() function to compare months

## Category 9: Complex Business Logic

44. **"What is the inventory turnover rate? (sales / average inventory)"**
    - Tests: Multiple tables, complex calculation
    - Expected: Calculate sales from invoices, average inventory from inventory_ledger

45. **"Show me outlets with declining sales (sales decreased from last month to this month)"**
    - Tests: Self-join or subquery, comparison
    - Expected: Compare sales between two months per outlet

46. **"What is the average delivery time? (from order creation to delivery completion)"**
    - Tests: delivery_orders, date difference calculation
    - Expected: Calculate difference between created_at and completed_at dates

47. **"Which products have the highest profit margin? (revenue - cost)"**
    - Tests: invoice_details, price_list, calculation
    - Expected: JOIN tables, calculate margin, ORDER BY DESC

## Category 10: Edge Cases & Performance

48. **"Show me all invoices from the largest table (without LIMIT)"**
    - Tests: Handling large tables, should still apply LIMIT for safety
    - Expected: Should apply LIMIT even if user doesn't specify

49. **"What is the total count of all records across all invoice tables?"**
    - Tests: UNION across all year tables, COUNT
    - Expected: UNION ALL all invoice year tables, COUNT

50. **"Find duplicates in the outlets table (outlets with same name or code)"**
    - Tests: Self-join or window functions, duplicate detection
    - Expected: GROUP BY name/code, HAVING COUNT > 1

## Category 11: Ambiguous Business Terms

51. **"What is our sales performance?"**
    - Tests: Understanding ambiguous terms, needs PDF context
    - Expected: Should ask for clarification or use most common interpretation

52. **"Show me customer data"**
    - Tests: Business term mapping (customer → outlets/key_accounts)
    - Expected: Should map to outlets or key_accounts based on PDF context

53. **"What is the stock situation?"**
    - Tests: Ambiguous question, multiple interpretations
    - Expected: Should clarify or show comprehensive stock overview

## Category 12: Multi-Table Complex Joins

54. **"Show me the complete sales pipeline: outlet → order → invoice → payment"**
    - Tests: Multiple JOINs across 4+ tables
    - Expected: JOIN outlets → delivery_orders → invoices → payment_logs

55. **"What is the revenue per outlet per product category?"**
    - Tests: Three-way JOIN, multiple aggregations
    - Expected: JOIN outlets, invoices, invoice_details, products, GROUP BY outlet and category

56. **"Show me van stock levels by outlet and product"**
    - Tests: Complex JOIN across van, outlet, product tables
    - Expected: JOIN van_stock_ledger with outlets and products/SKUs

## Testing Strategy

### Start with Easy Questions
- Questions 1, 8, 21 (basic queries)

### Progress to Medium
- Questions 2, 9, 14, 22 (year partitioning, JOINs)

### Test Hard Questions
- Questions 3, 12, 28, 44 (complex calculations, multiple tables)

### Edge Cases
- Questions 48, 49, 50 (performance, large tables, duplicates)

## Expected Behaviors

1. **Year Partitioning**: Should automatically select correct year tables based on date ranges
2. **LIMIT Clauses**: Should always include LIMIT for large tables (1000 max)
3. **Date Filtering**: Should use proper date ranges and timezone handling
4. **Business Terms**: Should map business terminology to database terms using PDF context
5. **Error Handling**: Should provide helpful error messages if query fails
6. **Performance**: Should use indexed columns in WHERE clauses

## Notes

- Some questions may need adjustment based on actual column names and business rules
- Questions assume certain table/column names exist - adjust if needed
- PDF manual context is critical for understanding business terminology
- Year tables (y2021-y2025) need to be correctly identified based on date ranges

---

*Use these questions to thoroughly test the chatbot's capabilities across different complexity levels.*

