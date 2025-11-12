export function parseIngredient(line) {
  const cleaned = line.trim();
  const priceMatch = cleaned.match(/\$(\d+\.?\d*)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;
  const withoutPrice = cleaned.replace(/\(?\$\d+\.?\d*\)?/g, '').trim();
  const qtyMatch = withoutPrice.match(/^(\d+\.?\d*)\s*([a-z]+)?/i);
  
  return {
    item: withoutPrice.replace(/^(\d+\.?\d*)\s*([a-z]+)?\s*/i, '').trim(),
    quantity: qtyMatch ? parseFloat(qtyMatch[1]) : null,
    unit: qtyMatch?.[2] || null,
    price,
    raw: line
  };
}

export function extractTotalCost(text) {
  const match = text?.match(/total[:\s]+\$(\d+\.?\d*)/i);
  return match ? parseFloat(match[1]) : null;
}

export function extractFamilySize(text) {
  const match = text?.match(/family\s+of\s+(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

export function extractMealCount(text) {
  const match = text?.match(/(\d+)\s+meals?/i);
  return match ? parseInt(match[1]) : null;
}

export function normalizeURL(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url;
  }
}
