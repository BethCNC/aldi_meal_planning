import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '../ui/Button';
import { IconRefresh, IconSearch, IconX } from '@tabler/icons-react';

export function SwapRecipeModal({ isOpen, onClose, onSwap, currentRecipe }) {
  const [mode, setMode] = useState('initial'); // initial, preference
  const [preference, setPreference] = useState('');
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async (type) => {
    setSwapping(true);
    try {
      if (type === 'random') {
        await onSwap({});
      } else if (type === 'preference') {
        await onSwap({ query: preference });
      }
      onClose();
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setSwapping(false);
      setMode('initial');
      setPreference('');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-sm rounded-2xl bg-surface-page p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <Dialog.Title className="text-lg font-bold text-text-body">
              Swap Meal
            </Dialog.Title>
            <button onClick={onClose} className="text-icon-subtle hover:text-text-body">
              <IconX size={20} />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-icon-subtle mb-1">Current Recipe:</p>
            <p className="font-medium text-text-body">{currentRecipe?.name}</p>
          </div>

          {mode === 'initial' ? (
            <div className="space-y-3">
              <Button 
                variant="secondary" 
                className="w-full justify-start" 
                iconLeading={<IconRefresh size={18} />}
                onClick={() => handleSwap('random')}
                disabled={swapping}
              >
                Surprise Me (Random)
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start" 
                iconLeading={<IconSearch size={18} />}
                onClick={() => setMode('preference')}
                disabled={swapping}
              >
                I have a preference...
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-body mb-2">
                  What are you in the mood for?
                </label>
                <input
                  type="text"
                  value={preference}
                  onChange={(e) => setPreference(e.target.value)}
                  placeholder="e.g. Chicken, no pasta, something spicy"
                  className="w-full px-3 py-2 rounded-lg border border-border-subtle focus:ring-2 focus:ring-primary focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMode('initial')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => handleSwap('preference')} 
                  disabled={!preference.trim() || swapping}
                  className="flex-1"
                >
                  Find Match
                </Button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

