import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/numberFormat';

export function RecipeReviewCard({ recipe, onApprove, onReject, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState(recipe);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleSave = () => {
    onUpdate(recipe.id, editedRecipe);
    setIsEditing(false);
  };

  const handleReject = () => {
    if (showRejectInput && rejectReason) {
      onReject(recipe.id, rejectReason);
      setShowRejectInput(false);
      setRejectReason('');
    } else {
      setShowRejectInput(true);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          {isEditing ? (
            <input
              type="text"
              value={editedRecipe.name}
              onChange={(e) => setEditedRecipe({ ...editedRecipe, name: e.target.value })}
              className="w-full font-semibold text-lg border rounded px-2 py-1"
            />
          ) : (
            <h3 className="font-semibold text-lg text-text-body">{recipe.name}</h3>
          )}
          
          <div className="flex gap-2 text-sm text-icon-subtle">
            <span>{recipe.source_url ? 'Scraped' : 'AI Generated'}</span>
            <span>•</span>
            <span>{new Date(recipe.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
           <Button 
            variant="ghost" 
            size="small"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-text-body">Stats</p>
          <ul className="text-icon-subtle mt-1 space-y-1">
            <li>Servings: {isEditing ? (
              <input 
                type="number" 
                value={editedRecipe.servings || ''}
                onChange={e => setEditedRecipe({...editedRecipe, servings: Number(e.target.value)})}
                className="w-16 border rounded px-1"
              />
            ) : recipe.servings}</li>
            <li>Cost/Serving: {formatCurrency(recipe.cost_per_serving)}</li>
            <li>Total Cost: {formatCurrency(recipe.total_cost)}</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-text-body">Category</p>
          {isEditing ? (
            <select
              value={editedRecipe.category || ''}
              onChange={e => setEditedRecipe({...editedRecipe, category: e.target.value})}
              className="border rounded px-1 w-full mt-1"
            >
              <option value="Chicken">Chicken</option>
              <option value="Beef">Beef</option>
              <option value="Pork">Pork</option>
              <option value="Seafood">Seafood</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Other">Other</option>
            </select>
          ) : (
            <p className="text-icon-subtle mt-1">{recipe.category || 'Uncategorized'}</p>
          )}
        </div>
      </div>

      <div className="border-t border-border-subtle pt-4">
        <p className="font-medium text-text-body mb-2">Ingredients ({recipe.recipe_ingredients?.length || 0})</p>
        <div className="max-h-32 overflow-y-auto text-sm text-icon-subtle space-y-1">
          {recipe.recipe_ingredients?.map((ing, i) => (
            <div key={i} className="flex justify-between">
              <span>{ing.quantity} {ing.unit} {ing.ingredient_name}</span>
              <span>{formatCurrency(ing.calculated_cost)}</span>
            </div>
          ))}
        </div>
      </div>

      {isEditing ? (
        <div className="pt-2 flex justify-end">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      ) : (
        <div className="pt-2 flex justify-between items-center gap-3">
           <div className="flex-1">
             {showRejectInput && (
               <input
                 type="text"
                 placeholder="Reason for rejection..."
                 value={rejectReason}
                 onChange={(e) => setRejectReason(e.target.value)}
                 className="w-full text-sm border rounded px-2 py-2"
                 autoFocus
               />
             )}
           </div>
           <div className="flex gap-2">
             <Button 
               variant="ghost" 
               className="text-error hover:text-error hover:bg-error/10"
               onClick={handleReject}
             >
               {showRejectInput ? 'Confirm Reject' : 'Reject'}
             </Button>
             <Button onClick={() => onApprove(recipe.id)}>
               Approve
             </Button>
           </div>
        </div>
      )}
    </Card>
  );
}

