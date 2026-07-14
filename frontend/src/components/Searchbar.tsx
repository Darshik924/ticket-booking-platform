'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Searchbar({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Local state to hold the input term before searching
  const [term, setTerm] = useState(searchParams.get('query')?.toString() || '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (term.trim()) {
      params.set('query', term.trim());
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <input
          id="search"
          className="peer block w-full h-9 rounded-md border border-border bg-background pl-10 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:border-ring"
          placeholder={placeholder}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground peer-focus:text-foreground" />
      </div>
      <Button type="submit" className="h-9 px-4 font-semibold">
        Search
      </Button>
    </form>
  );
}