import { useCallback } from 'react';

interface UseShotGridSelectionProps {
  selectedItems: Set<string>;
  setSelectedItems: (items: Set<string>) => void;
}

interface UseShotGridSelectionReturn {
  handleItemSelect: (itemId: string, checked: boolean) => void;
  handleSelectAll: (
    items: Array<{ id?: string | number; code?: string }>,
    checked: boolean,
  ) => void;
}

/**
 * Hook to manage item selection and detail panel for ShotGrid component
 */
export function useShotGridSelection({
  selectedItems,
  setSelectedItems,
}: UseShotGridSelectionProps): UseShotGridSelectionReturn {
  const handleItemSelect = useCallback(
    (itemId: string, checked: boolean) => {
      const newSelected = new Set(selectedItems);
      if (checked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      setSelectedItems(newSelected);
    },
    [selectedItems, setSelectedItems],
  );

  const handleSelectAll = useCallback(
    (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => {
      const newSelected = new Set(selectedItems);
      items.forEach((item) => {
        // Use id as primary identifier (all migrated entities have id)
        const itemId = item.id ? String(item.id) : null;
        if (itemId) {
          if (checked) {
            newSelected.add(itemId);
          } else {
            newSelected.delete(itemId);
          }
        }
      });
      setSelectedItems(newSelected);
    },
    [selectedItems, setSelectedItems],
  );

  return {
    handleItemSelect,
    handleSelectAll,
  };
}
