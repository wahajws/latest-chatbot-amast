# AMAST DMS Specific Questions - Based on Sales Manual

These questions are specifically tailored to the AMAST Distributor Management System based on the Sales Manual terminology and business processes.

## Category 1: Finance & Invoicing (AMAST Specific)

### Invoice Analysis
1. **"What is the total invoice amount for Key Account (K) price group this month?"**
   - Tests: Price group filtering, invoice aggregation, date filtering
   - AMAST Context: Key Account (K) is a specific price group in the system

2. **"Show me all voided invoices from last week"**
   - Tests: Void status filtering, date range
   - AMAST Context: Void is a finance operation in AMAST

3. **"What is the total credit note amount issued this quarter?"**
   - Tests: Credit note table, quarter calculation, aggregation
   - AMAST Context: Credit Note is a finance component

4. **"Compare invoice totals between Distributor Price and Retailer price groups this year"**
   - Tests: Price group comparison, year aggregation
   - AMAST Context: These are specific price groups: Distributor Price, Retailer, Key Account (K), Key Account (L)

5. **"What is the total refund amount processed last month?"**
   - Tests: Refund table, date filtering, aggregation
   - AMAST Context: Refund is a finance operation

6. **"Show me invoices with debit notes attached"**
   - Tests: Invoice and debit note relationship
   - AMAST Context: Debit Note is a finance component

7. **"What is the Statement of Account (SoA) total for all outlets?"**
   - Tests: SoA table, outlet aggregation
   - AMAST Context: Statement of Account is a finance report

## Category 2: Van Operations (AMAST Specific)

### Van Allotment
8. **"What is the total quantity allotted to vans this week?"**
   - Tests: van_allot_details, date filtering, aggregation
   - AMAST Context: Van Allotment is a key operation

9. **"Show me vans with pending allotments (requested but not fully allotted)"**
   - Tests: van_allot_details, van_request_details, comparison
   - AMAST Context: Van Allotment and Van Request are separate operations

10. **"What is the average allotment quantity per van this month?"**
    - Tests: van_allot_details, AVG, GROUP BY van
    - AMAST Context: Van Allotment tracking

### Van Stock & Reconciliation
11. **"What is the current stock level in all vans?"**
    - Tests: van_stock_ledger, latest date, aggregation
    - AMAST Context: Van stock is tracked in van_stock_ledger

12. **"Show me vans that need stock reconciliation (stock mismatch detected)"**
    - Tests: Stock reconciliation logic, van_stock_ledger comparison
    - AMAST Context: Stock Reconciliation is an operation

13. **"What is the total value of stock returned from vans last week?"**
    - Tests: van_return operations, date filtering
    - AMAST Context: Van Return is an operation

14. **"Which vans have the highest stock value?"**
    - Tests: van_stock_ledger, JOIN with price_list, calculation
    - AMAST Context: Van stock valuation

### Van Visits & Requests
15. **"How many van visits were recorded this month?"**
    - Tests: van_visits table, date filtering, COUNT
    - AMAST Context: Van visits are tracked

16. **"Show me van requests that are still pending approval"**
    - Tests: van_request_details, status filtering
    - AMAST Context: Van Request workflow

17. **"What is the average number of van visits per outlet?"**
    - Tests: van_visits, outlet grouping, AVG
    - AMAST Context: Visit tracking

## Category 3: Outlet Management (AMAST Specific)

### Outlet Performance
18. **"What is the total sales for Key Account outlets this year?"**
    - Tests: Outlet type filtering, sales aggregation
    - AMAST Context: Key Account is a customer type

19. **"Show me outlets that haven't received any delivery orders in the last 30 days"**
    - Tests: delivery_orders, outlet filtering, date comparison
    - AMAST Context: Outlet activity tracking

20. **"What is the average invoice value per outlet type?"**
    - Tests: outlets, invoices, outlet type grouping
    - AMAST Context: Outlet categorization

21. **"Which outlets have the highest number of credit notes?"**
    - Tests: credit_notes, outlet grouping, COUNT
    - AMAST Context: Credit note tracking per outlet

### Outlet Contacts & Information
22. **"How many active outlets do we have in each RMO?"**
    - Tests: outlets, rmos, RMO grouping, status filtering
    - AMAST Context: RMO (Regional Management Office) structure

23. **"Show me outlet contact information for outlets with pending invoices"**
    - Tests: outlets, outlet_contacts, invoices, JOIN
    - AMAST Context: Outlet contact management

## Category 4: RMO (Regional Management Office) Analysis

24. **"What is the total RMO amount allocated this month?"**
    - Tests: RMO tables, rmo_payment_logs, aggregation
    - AMAST Context: RMO has predefined and dynamic amounts

25. **"Show me outlets that exceeded their RMO target volume"**
    - Tests: RMO target tracking, outlet sales comparison
    - AMAST Context: Dynamic RMO has target_vol and cap_amount

26. **"What is the RMO performance by region (total sales vs RMO allocated)?"**
    - Tests: RMO allocation, sales aggregation, comparison
    - AMAST Context: RMO performance tracking

27. **"Which RMO has the highest number of active outlets?"**
    - Tests: rmos, outlets, COUNT, grouping
    - AMAST Context: RMO outlet distribution

## Category 5: Product & SKU Management

### Product Information
28. **"What is the total quantity sold for each SKU this month?"**
    - Tests: invoice_details or sales tables, SKU grouping
    - AMAST Context: Products are tracked as SKUs

29. **"Show me products with their effective prices for Key Account (L) price group"**
    - Tests: price_list, price group filtering, effective date
    - AMAST Context: Price groups and effective dates

30. **"What is the inventory level for each SKU across all sites?"**
    - Tests: inventory tables, SKU grouping, site aggregation
    - AMAST Context: Multi-site inventory tracking

31. **"Which products have the highest sales volume this quarter?"**
    - Tests: invoice_details or sales, SKU grouping, quarter filtering
    - AMAST Context: Product performance

### UOM (Unit of Measure) Analysis
32. **"What is the sales quantity by UOM (Pack, Carton, etc.) this month?"**
    - Tests: invoice_details, UOM grouping, aggregation
    - AMAST Context: Products have Base UOM and sellable UOMs

33. **"Show me products sold in Carton UOM with their conversion to Pack UOM"**
    - Tests: UOM conversion, product details
    - AMAST Context: UOM conversion is part of product setup

## Category 6: Inventory Management

### Stock Operations
34. **"What is the total inventory value across all sites?"**
    - Tests: inventory_daily_snapshot or inventory_ledger, price_list JOIN
    - AMAST Context: Multi-site inventory

35. **"Show me inventory transfers (transfer in and transfer out) for last week"**
    - Tests: Transfer operations, date filtering
    - AMAST Context: Transfer in/out are inventory operations

36. **"What is the total write-off amount this month?"**
    - Tests: Write-off operations, aggregation
    - AMAST Context: Write-off is an inventory operation

37. **"Which sites have inventory levels below reorder point?"**
    - Tests: inventory tables, threshold comparison
    - AMAST Context: Inventory management

### Daily Closing Inventory
38. **"What was the closing inventory value yesterday?"**
    - Tests: inventory_daily_snapshot, date filtering, latest snapshot
    - AMAST Context: Daily Closing Inventory is a data download

39. **"Show me the inventory movement (opening vs closing) for the last 7 days"**
    - Tests: inventory_daily_snapshot, date range, comparison
    - AMAST Context: Daily inventory tracking

## Category 7: Delivery Orders & Operations

40. **"What is the total quantity delivered this month by delivery order?"**
    - Tests: delivery_order_details, aggregation, date filtering
    - AMAST Context: Delivery order tracking

41. **"Show me delivery orders that are still pending completion"**
    - Tests: delivery_orders, status filtering
    - AMAST Context: Delivery order workflow

42. **"What is the average delivery order value per outlet type?"**
    - Tests: delivery_orders, outlets, outlet type grouping
    - AMAST Context: Delivery performance by outlet type

43. **"Which outlets have the most delivery orders this year?"**
    - Tests: delivery_orders, outlet grouping, COUNT, year filtering
    - AMAST Context: Outlet delivery activity

## Category 8: Daily & Weekly Reports (AMAST Data Downloads)

### Daily Sales Report
44. **"What is the total gross quantity sold today?"**
    - Tests: Daily sales data, GROSS_QUANTITY, date filtering
    - AMAST Context: Daily Sales report has GROSS_QUANTITY, NET_QUANTITY, RETURN_QUANTITY

45. **"Show me products with return quantities in the daily sales report"**
    - Tests: Daily sales, RETURN_QUANTITY filtering
    - AMAST Context: Returns are tracked in daily sales

46. **"What is the total discount amount given today?"**
    - Tests: Daily sales, DISCOUNT_AMOUNT aggregation
    - AMAST Context: Discount tracking in daily sales

### Weekly Sales Report
47. **"What is the weekly sales total for last week?"**
    - Tests: Weekly sales data, date range, aggregation
    - AMAST Context: Weekly Sales is a data download

48. **"Compare weekly sales between this week and last week"**
    - Tests: Weekly sales, week comparison, date range
    - AMAST Context: Weekly sales comparison

### Daily Finance Report
49. **"What is the total revenue from the daily finance report today?"**
    - Tests: Daily finance report data, aggregation
    - AMAST Context: Daily Finance Report is a data download

50. **"Show me the breakdown of finance operations (invoice, receipt, credit note) today"**
    - Tests: Finance operations, grouping by type
    - AMAST Context: Finance operations tracking

## Category 9: Price Management

51. **"What is the effective price for SKU 'DHCLASARS' in Pack UOM for Retailer price group today?"**
    - Tests: price_list, SKU filtering, UOM, price group, effective date
    - AMAST Context: Price Checker functionality

52. **"Show me all price changes for Key Account (K) price group this month"**
    - Tests: price_list, price group filtering, effective date changes
    - AMAST Context: Price management with effective dates

53. **"What is the price difference between Distributor Price and Retailer price for each SKU?"**
    - Tests: price_list, price group comparison, calculation
    - AMAST Context: Multiple price groups per SKU

## Category 10: Complex Business Scenarios

54. **"What is the sales performance by RMO, including total sales, RMO allocated, and outlet count?"**
    - Tests: Multiple tables (sales, RMO, outlets), complex aggregation
    - AMAST Context: RMO performance dashboard

55. **"Show me the complete sales pipeline: Van Allotment → Delivery Order → Invoice → Receipt"**
    - Tests: Multiple JOINs across van_allot_details, delivery_orders, invoices, receipts
    - AMAST Context: End-to-end sales process

56. **"What is the inventory turnover rate by site? (sales / average inventory)"**
    - Tests: Sales calculation, inventory average, site grouping
    - AMAST Context: Inventory performance metrics

57. **"Which outlets have both high sales and high credit note rates?"**
    - Tests: Sales aggregation, credit note aggregation, outlet comparison
    - AMAST Context: Outlet risk analysis

58. **"What is the van utilization rate? (stock delivered / stock allotted)"**
    - Tests: van_allot_details, delivery_orders, calculation
    - AMAST Context: Van efficiency tracking

59. **"Show me products that are selling well but have low inventory levels"**
    - Tests: Sales aggregation, inventory levels, comparison
    - AMAST Context: Inventory planning

60. **"What is the average time from delivery order creation to invoice generation?"**
    - Tests: delivery_orders, invoices, date difference calculation
    - AMAST Context: Process efficiency

## Category 11: Master Data Queries

61. **"How many active SKUs do we have per principal?"**
    - Tests: Products/SKUs, principal grouping, status filtering
    - AMAST Context: Principal is master data

62. **"Show me all sites with their associated outlets"**
    - Tests: sites, outlets, relationship
    - AMAST Context: Site-outlet hierarchy

63. **"What is the distribution of outlets across different RMOs?"**
    - Tests: outlets, rmos, COUNT, grouping
    - AMAST Context: RMO coverage

64. **"Which vans are assigned to which users?"**
    - Tests: vans, users, assignment relationship
    - AMAST Context: Van-user assignment

## Category 12: Data Source & System Operations

65. **"What is the total sales by DATA_SOURCE_NAME in the daily sales report?"**
    - Tests: Daily sales, DATA_SOURCE_NAME grouping
    - AMAST Context: DATA_SOURCE_NAME tracks data origin (e.g., SP_NV02)

66. **"Show me all operations logged in the system today"**
    - Tests: Various log tables, date filtering
    - AMAST Context: System audit logs

67. **"What is the cash reconciliation status for all vans?"**
    - Tests: Cash reconciliation data, van grouping
    - AMAST Context: Cash Reconciliation is an operation

68. **"Which warehouses have completed closing for today?"**
    - Tests: Warehouse closing status, date filtering
    - AMAST Context: Warehouse Closing is an operation

## Category 13: Advanced Analytics

69. **"What is the sales trend by price group over the last 6 months?"**
    - Tests: Time series, price group grouping, monthly aggregation
    - AMAST Context: Price group performance

70. **"Show me the top 10 products by revenue for each RMO"**
    - Tests: Window functions or subquery, RMO partitioning
    - AMAST Context: Product performance by region

71. **"What is the month-over-month growth rate for Key Account sales?"**
    - Tests: Time series, growth calculation, Key Account filtering
    - AMAST Context: Key Account growth tracking

72. **"Which outlets have the highest average order value this quarter?"**
    - Tests: Invoice aggregation, outlet grouping, quarter filtering, AVG
    - AMAST Context: Outlet value analysis

## Testing Notes

### AMAST-Specific Terminology to Test:
- **Price Groups**: Distributor Price, Key Account (K), Key Account (L), Retailer
- **Operations**: Van Allotment, Van Request, Van Return, Stock Reconciliation, Cash Reconciliation, Warehouse Closing
- **Finance**: Invoice, Receipt, Credit Note, Void, Refund, Debit Note, Statement of Account (SoA)
- **Master Data**: Principal, Sites, Outlets, Vans, Users, Products/SKUs, Price, RMO
- **UOM**: Base UOM, Sellable UOM, Pack, Carton, UOM conversion
- **Data Downloads**: Price Checker, Daily Sales, Weekly Sales, Daily Closing Inventory, Daily Finance Report, SoA Listing

### Expected Behaviors:
1. Should understand AMAST-specific terms (RMO, UOM, Price Groups)
2. Should map business terms correctly (Key Account → outlets with Key Account type)
3. Should handle year partitioning for invoice and sales tables
4. Should understand the relationship between operations (Van Allotment → Delivery → Invoice)
5. Should use correct column names from actual schema

---

*Questions based on AMAST Sales Manual - DMS Version 1.3 (2022.04.26)*




