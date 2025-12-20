import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '../ui/Button';
import { addPantryItems } from '../../api/pantry';

export function LeftoverModal({ isOpen, onClose, recipe }) {
  const [selectedIngredients, setSelectedIngredients] = useState(new Set());
  const [quantities, setQuantities] = useState({});
  const [saving, setSaving] = useState(false);

  if (!recipe) return null;

  const ingredients = recipe.recipe_ingredients || [];

  const toggleIngredient = (id) => {
    const next = new Set(selectedIngredients);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // Default to 0.5 of original quantity as a guess for leftovers
      const ing = ingredients.find(i => i.ingredient_id === id);
      if (ing) {
        setQuantities(prev => ({ ...prev, [id]: (ing.quantity || 1) * 0.5 }));
      }
    }
    setSelectedIngredients(next);
  };

  const handleSave = async () => {
    if (selectedIngredients.size === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const items = Array.from(selectedIngredients).map(id => {
        const ing = ingredients.find(i => i.ingredient_id === id);
        return {
          ingredient_id: id,
          quantity: quantities[id] || 1,
          unit: ing.unit,
          source: 'leftover',
          must_use: true,
          notes: `Leftover from ${recipe.name}`
        };
      });

      await addPantryItems(items);
      onClose();
    } catch (error) {
      console.error('Failed to save leftovers:', error);
      alert('Failed to save leftovers');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-md rounded-2xl bg-surface-page p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-text-body">
            Save Leftovers?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-icon-subtle">
            Select any unused ingredients from <strong>{recipe.name}</strong> to add back to your pantry.
          </Dialog.Description>

          <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
            {ingredients.map((ing) => (
              <div key={ing.ingredient_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-card border border-transparent hover:border-border-subtle">
                <input
                  type="checkbox"
                  checked={selectedIngredients.has(ing.ingredient_id)}
                  onChange={() => toggleIngredient(ing.ingredient_id)}
                  className="h-5 w-5 rounded border-border-subtle text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-body">{ing.ingredient_name}</p>
                  <p className="text-xs text-icon-subtle">Recipe called for {ing.quantity} {ing.unit}</p>
                </div>
                {selectedIngredients.has(ing.ingredient_id) && (
                  <input
                    type="number"
                    value={quantities[ing.ingredient_id] || ''}
                    onChange={(e) => setQuantities({ ...quantities, [ing.ingredient_id]: Number(e.target.value) })}
                    className="w-20 rounded border border-border-subtle px-2 py-1 text-sm"
                    placeholder="Qty"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Skip
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : `Save ${selectedIngredients.size} Items`}
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

