export function formatQuantity(quantity, unit) {
  if (quantity === null || quantity === undefined || quantity === '') {
    return unit || '';
  }
  const parsed = Number(quantity);
  const formatted = Number.isFinite(parsed)
    ? parsed % 1 === 0
      ? parsed.toString()
      : parsed.toFixed(2).replace(/\.?0+$/, '')
    : quantity;
  return unit ? `${formatted} ${unit}` : formatted;
}

export function splitInstructions(instructions) {
  if (!instructions) {
    return [];
  }
  if (Array.isArray(instructions)) {
    return instructions.filter(Boolean);
  }
  return instructions
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}


