import { Checkbox } from '@nextui-org/react';

export const OrderSelectOverlay = ({ canBuy, selected, onSelect }) => (
  <div
    className="absolute top-0 left-0 w-full h-full z-30 cursor-pointer bg-gray-600 bg-opacity-50"
    onClick={() => onSelect?.(!selected)}
  >
    <div className="flex absolute top-4 right-4">
      <Checkbox
        isDisabled={!canBuy}
        isSelected={selected}
        onValueChange={onSelect}
      />
    </div>
  </div>
);
