import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useIngredientSearch() {
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = async (query, limit = 5) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, item, category, price_per_base_unit')
        .ilike('item', `%${query}%`)
        .limit(limit);

      if (error) {
        console.error('Ingredient search error:', error.message);
        setSuggestions([]);
      } else {
        setSuggestions(data || []);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clear = () => setSuggestions([]);

  return {
    suggestions,
    isSearching,
    search,
    clear
  };
}


