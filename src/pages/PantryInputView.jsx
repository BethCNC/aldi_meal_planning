import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PantryItemCard } from '../components/PantryItemCard';
import { useIngredientSearch } from '../hooks/useIngredientSearch';

export function PantryInputView() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { suggestions, search, clear } = useIngredientSearch();
  
  const handleInputChange = async (value) => {
    setInput(value);
    
    if (value.length > 1) {
      await search(value);
    } else {
      clear();
    }
  };
  
  const addToPantry = (ingredient) => {
    if (!ingredient || !ingredient.id) {
      console.error('Invalid ingredient:', ingredient);
      return;
    }
    
    if (!pantryItems.find(item => item.id === ingredient.id)) {
      setPantryItems([...pantryItems, { 
        ...ingredient, 
        quantity: 1, 
        unit: 'each', 
        mustUse: false 
      }]);
    }
    setInput('');
    clear();
  };
  
  const toggleMustUse = (id, checked) => {
    setPantryItems(pantryItems.map(item => 
      item.id === id ? { ...item, mustUse: checked } : item
    ));
  };
  
  const removeItem = (id) => {
    setPantryItems(pantryItems.filter(item => item.id !== id));
  };
  
  const handleContinue = () => {
    navigate('/recipe-suggestions', { state: { pantryItems } });
  };
  
  const handleSkip = () => {
    navigate('/recipe-suggestions', { state: { pantryItems: [] } });
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-body">What's in your kitchen?</h1>
        <p className="text-icon-subtle mt-2">
          Enter ingredients you'd like to use this week (2-5 items, takes 5 minutes)
        </p>
      </header>
      
      <div className="mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type an ingredient (e.g., shrimp, zucchini)..."
          className="w-full px-4 py-3 text-base border-2 border-border-subtle rounded-lg focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
        />
        
        {suggestions.length > 0 && (
          <ul className="mt-2 border border-border-subtle rounded-lg shadow-lg bg-surface-page">
            {suggestions.map((item) => (
              <li 
                key={item.id}
                onClick={() => addToPantry(item)}
                className="px-4 py-3 hover:bg-surface-card cursor-pointer text-text-body"
              >
                {item.item}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {pantryItems.length > 0 && (
        <div className="mb-8 space-y-2">
          {pantryItems.map((item) => (
            <PantryItemCard
              key={item.id}
              item={item}
              onToggleMustUse={toggleMustUse}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}
      
      <div className="flex gap-4">
        <Button variant="secondary" onClick={handleSkip}>
          Skip This Step
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={pantryItems.length === 0}
        >
          Find Recipes →
        </Button>
      </div>
    </div>
  );
}
