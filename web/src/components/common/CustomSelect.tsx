import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedValue: string | null;
  setSelectedValue: React.Dispatch<React.SetStateAction<string | null>>;
  triggerRef: React.RefObject<HTMLButtonElement>;
  onValueChange?: (value: string) => void;
}

const SelectContext = createContext<SelectContextProps | undefined>(undefined);

const useCustomSelect = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('useCustomSelect must be used within a Select provider');
  }
  return context;
};

export const Select = ({ children, defaultValue, onValueChange }: { children: React.ReactNode, defaultValue?: string, onValueChange?: (value: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(defaultValue || null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, selectedValue, setSelectedValue, triggerRef, onValueChange }}>
      <div ref={selectRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const { isOpen, setIsOpen, triggerRef } = useCustomSelect();
    return (
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus:ring-zinc-300",
          className
        )}
      >
        {children}
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    );
  };

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
    const { selectedValue } = useCustomSelect();
    return (
      <span>
        {selectedValue || placeholder}
      </span>
    );
  };
  
  export const SelectContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const { isOpen, triggerRef } = useCustomSelect();
    const [contentWidth, setContentWidth] = useState<number | undefined>(undefined);
  
    useEffect(() => {
      if (triggerRef.current) {
        setContentWidth(triggerRef.current.offsetWidth);
      }
    }, [isOpen, triggerRef]);
  
    if (!isOpen) return null;
  
    return (
      <div
        style={{ width: contentWidth }}
        className={cn(
          "absolute z-50 mt-1 max-h-96 min-w-[8rem] overflow-auto rounded-md border border-zinc-200 bg-white text-zinc-950 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
          className
        )}
      >
        <div className="p-1">
          {children}
        </div>
      </div>
    );
  };
  
  export const SelectItem = ({ value, children, className }: { value: string, children: React.ReactNode, className?: string }) => {
    const { setSelectedValue, setIsOpen, onValueChange } = useCustomSelect();
    
    const handleSelect = () => {
      setSelectedValue(value);
      setIsOpen(false);
      if (onValueChange) {
        onValueChange(value);
      }
    };
  
    return (
      <div
        onClick={handleSelect}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
          className
        )}
      >
        {children}
      </div>
    );
  }; 