# Aldi Price Fetching Guide

**Goal:** Automatically fetch current prices from Aldi's website and update Notion

---

## 🎯 The Challenge

- ❌ Aldi has **no public API**
- ✅ Prices are available on **Aldi's website** (aldi.us)
- ✅ Prices available on **Instacart** (may include markup)
- ⚠️ Prices vary by **location**
- ⚠️ Website structure may change (scraping can break)

---

## 🛠️ Tools Created

### **1. Basic Price Fetcher** (`scripts/fetch-aldi-prices.js`)

**Features:**
- Searches Aldi's website for products
- Optional Instacart checking
- Updates Notion ingredients with current prices
- Rate limiting to be respectful

**Usage:**

```bash
# Search for a specific product
npm run fetch:prices -- --search "ground beef"

# Update one ingredient by name
npm run fetch:prices -- --ingredient-name "ground beef" [--instacart]

# Update all ingredients (be careful - slow!)
npm run fetch:prices -- --update-all [--limit 10] [--instacart]

# Test without updating
npm run fetch:prices -- --dry-run --update-all --limit 5
```

---

### **2. Advanced Price Fetcher** (`scripts/fetch-prices-advanced.js`)

**Features:**
- Searches multiple sources simultaneously
- Compares prices and picks best match
- Prioritizes ingredients used in recipes
- Better error handling

**Usage:**

```bash
# Search for one product
node scripts/fetch-prices-advanced.js --ingredient "ground beef"

# Update priority ingredients (ones in your recipes)
npm run fetch:prices:advanced -- --update-priority-ingredients [--limit 20] [--dry-run]
```

---

## 📋 Recommended Workflow

### **Option 1: Quick Price Check** (5 minutes)

When you need to check a few specific items:

```bash
npm run fetch:prices -- --search "chicken breast"
npm run fetch:prices -- --search "ground beef"
npm run fetch:prices -- --search "milk"
```

Then manually update Notion if prices changed.

---

### **Option 2: Update Priority Ingredients** (30-60 minutes)

Update prices for ingredients you actually use:

```bash
# Test first
npm run fetch:prices:advanced -- --update-priority-ingredients --limit 10 --dry-run

# If looks good, actually update
npm run fetch:prices:advanced -- --update-priority-ingredients --limit 30
```

This focuses on ingredients used in your recipes first.

---

### **Option 3: Full Update** (Several hours)

Update all ingredients (only do occasionally):

```bash
# Test with small batch first
npm run fetch:prices -- --update-all --limit 10 --dry-run

# Then update more
npm run fetch:prices -- --update-all --limit 50
```

**Warning:** This is slow due to rate limiting. Only run when you have time.

---

## ⚠️ Important Considerations

### **1. Website Structure Changes**

Aldi's website HTML structure may change, breaking the scrapers. If you see errors:

1. Check if Aldi's website still works manually
2. Update selectors in `fetch-aldi-prices.js` or `fetch-prices-advanced.js`
3. The selectors are in the `searchAldiWebsite()` function

### **2. Location-Based Pricing**

Prices may vary by:
- Your zip code/location
- Store location
- Regional pricing

The scripts use generic search, so you may need to:
- Set location in search URL
- Manually verify prices match your store

### **3. Rate Limiting**

Scripts include 2-second delays between requests to be respectful. Still:
- Don't run too frequently
- Use `--limit` to test with small batches first
- Consider running during off-peak hours

### **4. Instacart Markups**

Instacart prices may be **10-20% higher** than in-store:
- Use as reference, but verify
- Prefer Aldi website results
- Note that Instacart prices may include service fees

---

## 🔧 Customization

### **Update Selectors**

If scraping stops working, update selectors in the scripts:

```javascript
// In fetch-aldi-prices.js, look for:
$('.product-tile, .product-item').each(...)

// Update these selectors based on Aldi's current HTML structure
// Use browser DevTools to inspect the page
```

### **Add Location**

To search for a specific store location:

```javascript
// In searchAldiWebsite(), you can add:
const location = 'zipcode=12345'; // Your zip code
const searchUrl = `https://www.aldi.us/en/grocery/search.html?text=${productName}&${location}`;
```

### **Add More Sources**

You can add other sources (e.g., Google Shopping):

```javascript
async function searchGoogleShopping(productName) {
  // Implementation
}
```

Then include in `fetchPricesWithComparison()`.

---

## 📊 Understanding Results

### **Price Comparison**

When multiple sources return prices:
- **Aldi website** (highest priority) - closest to store prices
- **Instacart** (lower priority) - may have markup

### **Confidence Levels**

- `high`: Direct match from Aldi website
- `medium`: From Instacart or partial match
- `low`: Estimated or from third-party source

---

## 💡 Tips

### **1. Regular Updates**

- Update priority ingredients monthly
- Full update quarterly
- Check specific items as needed

### **2. Verify Results**

After running, spot-check a few prices:
- Compare to your last receipt
- Visit Aldi website manually for key items
- Adjust if prices seem off

### **3. Handle Errors Gracefully**

If an ingredient fails:
- It's logged but doesn't stop the process
- Review errors at the end
- Manually update problem ingredients

### **4. Use Dry Run**

Always test with `--dry-run` first:
```bash
npm run fetch:prices:advanced -- --update-priority-ingredients --limit 5 --dry-run
```

---

## 🚨 Troubleshooting

### **"No prices found"**

**Possible causes:**
1. Aldi's website structure changed → Update selectors
2. Product name doesn't match → Try variations
3. Product discontinued → Skip or mark in Notion

**Solution:**
- Test search manually on Aldi's website
- Update product name to match exactly
- Check if product still exists

### **"Rate limit exceeded"**

**Solution:**
- Add longer delays (increase `DELAY_MS` constant)
- Reduce batch size (lower `--limit`)
- Run during off-peak hours

### **"Prices seem wrong"**

**Possible causes:**
1. Location mismatch (different store prices)
2. Sale prices (temporary)
3. Instacart markup

**Solution:**
- Verify on Aldi website directly
- Check if item is on sale
- Prefer Aldi website results over Instacart

---

## ✅ Success Checklist

**Price fetching is working when:**

1. ✅ **Can search for products:**
   ```bash
   npm run fetch:prices -- --search "milk"
   ```
   Returns prices

2. ✅ **Updates priority ingredients:**
   ```bash
   npm run fetch:prices:advanced -- --update-priority-ingredients --limit 10
   ```
   Updates 80%+ of ingredients successfully

3. ✅ **Prices are reasonable:**
   - Within expected range for Aldi
   - Match recent shopping experience
   - Don't fluctuate wildly

4. ✅ **Notion updates work:**
   - Prices appear in Notion after update
   - Recipe costs recalculate correctly

---

## 🔄 Integration with Cost Calculator

After updating prices, recalculate recipe costs:

```bash
# 1. Update prices
npm run fetch:prices:advanced -- --update-priority-ingredients --limit 30

# 2. Recalculate recipe costs
npm run calc:costs:v3 -- --update

# 3. Generate meal plan with accurate costs
npm run plan:generate -- --budget 75
```

---

## 📝 Alternative Approaches

If scraping becomes unreliable:

### **Option 1: Manual Updates**
- Use bulk update tool (`npm run bulk:update-ingredients`)
- Enter prices from receipts
- More work but 100% accurate

### **Option 2: Receipt Scanning**
- Take photos of receipts
- Use OCR to extract prices (future enhancement)
- Auto-update Notion

### **Option 3: Community Data**
- Join Aldi price tracking communities
- Use shared price lists
- Update periodically

---

**The tools are ready - start with small batches and scale up as needed!** 🚀
