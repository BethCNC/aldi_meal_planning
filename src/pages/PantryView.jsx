import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PantryItemCard } from '../components/PantryItemCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function PantryView() {
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPantryItems();
  }, []);
  
  const loadPantryItems = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_pantry')
        .select(`
          *,
          ingredient:ingredients(*)
        `)
        .gt('quantity', 0)
        .order('must_use', { ascending: false })
        .order('use_by_date', { ascending: true });
      
      setPantryItems(data || []);
    } catch (error) {
      console.error('Error loading pantry:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleMustUse = async (id, checked) => {
    try {
      await supabase
        .from('user_pantry')
        .update({ must_use: checked })
        .eq('id', id);
      
      loadPantryItems();
    } catch (error) {
      console.error('Error updating pantry item:', error);
    }
  };
  
  const handleRemove = async (id) => {
    try {
      await supabase
        .from('user_pantry')
        .delete()
        .eq('id', id);
      
      loadPantryItems();
    } catch (error) {
      console.error('Error removing pantry item:', error);
    }
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading pantry..." />;
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-body">Your Pantry</h1>
        <p className="text-stone-600 mt-2">
          Manage ingredients you have on hand
        </p>
      </header>
      
      {pantryItems.length === 0 ? (
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-4 text-text-body">No pantry items yet</h2>
          <p className="text-stone-600 mb-6">
            Add items from recipes or enter them manually
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pantryItems.map((item) => (
            <PantryItemCard
              key={item.id}
              item={item}
              onToggleMustUse={handleToggleMustUse}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
