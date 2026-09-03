'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    if (value) router.push(`/new-tokens?q=${encodeURIComponent(value)}`);
  }

  return (
    <form className="search" onSubmit={submit} role="search">
      <span aria-hidden="true">⌕</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search tokens" placeholder="Search tokens or contract" />
      <kbd>↵</kbd>
    </form>
  );
}
