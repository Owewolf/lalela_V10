import React from 'react';
import { Search, SlidersHorizontal, Bell, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 frosted-earth flex justify-between items-center w-full px-6 py-4 border-b border-surface-container">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-on-surface tracking-tight">Parkwood Dashboard</h2>
      </div>
      <div className="flex gap-2">
        <button className="text-primary p-2 rounded-full hover:bg-surface-container-high transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-primary p-2 rounded-full hover:bg-surface-container-high transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export const SearchBar = ({ value, onChange }: { value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  return (
    <section className="mt-6 mb-8">
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
          <Search className="w-5 h-5" />
        </div>
        <input 
          className="w-full bg-white border-none focus:ring-2 focus:ring-secondary/10 py-3.5 pl-12 pr-4 rounded-2xl shadow-ambient transition-all placeholder:text-outline/60" 
          placeholder="Search local services..." 
          type="text"
          value={value}
          onChange={onChange}
        />
      </div>
    </section>
  );
};
