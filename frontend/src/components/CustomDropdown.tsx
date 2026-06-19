import { useState, useRef, useEffect } from 'react';
import MSIcon from './MSIcon';
import clsx from 'clsx';
import type { ReactNode } from 'react';

type DropdownValue = string | number;

export interface DropdownOption<T extends DropdownValue> {
  value: T;
}

interface CustomDropdownProps<T extends DropdownValue, TOption extends DropdownOption<T>> {
  value: T;
  onChange: (value: T) => void;
  options: TOption[];
  renderSelected: (option: TOption) => ReactNode;
  renderOption: (option: TOption, isSelected: boolean) => ReactNode;
  placeholder?: string;
  className?: string;
}

export default function CustomDropdown<T extends DropdownValue, TOption extends DropdownOption<T>>({ 
  value, 
  onChange, 
  options, 
  renderSelected, 
  renderOption,
  placeholder = 'Select...',
  className = ''
}: CustomDropdownProps<T, TOption>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={clsx("relative w-full", className)} ref={dropdownRef}>
      <div 
        className={clsx(
          "flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors",
          isOpen ? "bg-gray-50 border-[#007A64] ring-1 ring-[#007A64]" : "bg-white hover:bg-gray-50"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 flex items-center gap-3 overflow-hidden">
           {selectedOption ? renderSelected(selectedOption) : <span className="text-gray-500 font-medium text-base">{placeholder}</span>}
        </div>
        <MSIcon name={isOpen ? "expand_less" : "expand_more"} className="text-gray-500 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-50 max-h-64 overflow-y-auto py-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div 
                key={String(opt.value)}
                className={clsx(
                  "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                  isSelected ? "bg-[#EAF5F2] text-[#007A64]" : "hover:bg-gray-50 text-gray-900"
                )}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {renderOption(opt, isSelected)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
