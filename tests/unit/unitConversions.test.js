import { convertUnit, calculatePricePerUnit, calculateIngredientCost, normalizeUnit } from '../../backend/utils/unitConversions.js';

describe('Unit Conversions', () => {
  describe('normalizeUnit', () => {
    test('normalizes common weight units', () => {
      expect(normalizeUnit('lbs')).toBe('lb');
      expect(normalizeUnit('pound')).toBe('lb');
      expect(normalizeUnit('oz')).toBe('oz');
      expect(normalizeUnit('ounces')).toBe('oz');
    });

    test('normalizes common volume units', () => {
      expect(normalizeUnit('cups')).toBe('cup');
      expect(normalizeUnit('tablespoon')).toBe('tbsp');
      expect(normalizeUnit('tsp')).toBe('tsp');
    });

    test('handles casing and whitespace', () => {
      expect(normalizeUnit('  LBS  ')).toBe('lb');
      expect(normalizeUnit('Fluid Ounce')).toBe('fl oz');
    });
  });

  describe('convertUnit', () => {
    test('converts weight to weight', () => {
      expect(convertUnit(1, 'lb', 'oz')).toBe(16);
      expect(convertUnit(16, 'oz', 'lb')).toBe(1);
      expect(convertUnit(1, 'kg', 'g')).toBe(1000);
    });

    test('converts volume to volume', () => {
      expect(convertUnit(1, 'cup', 'fl oz')).toBe(8);
      expect(convertUnit(1, 'tbsp', 'tsp')).toBe(3);
      expect(convertUnit(2, 'pint', 'cup')).toBeCloseTo(4, 1); // 1 pint = 2 cups
    });

    test('handles density-based conversions', () => {
      // Water: 1 cup ≈ 8 oz (weight)
      expect(convertUnit(1, 'cup', 'oz', 'water')).toBeCloseTo(8, 0);
      
      // Flour: 1 cup ≈ 4.25 oz
      expect(convertUnit(1, 'cup', 'oz', 'flour')).toBeCloseTo(4.25, 1);
      
      // Rice: 1 cup ≈ 7 oz
      expect(convertUnit(1, 'cup', 'oz', 'rice')).toBeCloseTo(7, 0);
    });

    test('returns original quantity if conversion impossible', () => {
      expect(convertUnit(10, 'lb', 'meter')).toBe(10);
    });
  });

  describe('calculateIngredientCost', () => {
    test('calculates cost for simple unit match', () => {
      // $5 for 1 package, need 1
      expect(calculateIngredientCost(5, 1, 'each', 1, 'each')).toBe(5);
    });

    test('calculates cost with package rounding (up)', () => {
      // $3 for 10 oz package. Need 15 oz. Should buy 2 packages ($6).
      expect(calculateIngredientCost(3, 10, 'oz', 15, 'oz')).toBe(6);
    });

    test('calculates cost with unit conversion', () => {
      // $4 for 1 lb (16 oz). Need 8 oz. Should buy 1 package ($4).
      expect(calculateIngredientCost(4, 1, 'lb', 8, 'oz')).toBe(4);
      
      // $4 for 1 lb. Need 20 oz (1.25 lb). Should buy 2 packages ($8).
      expect(calculateIngredientCost(4, 1, 'lb', 20, 'oz')).toBe(8);
    });
  });
});

