import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { PencilIcon, XIcon, PlusIcon, CheckIcon, TagIcon } from 'lucide-react';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

import { Link } from '~/components/link';

import { useToastMutation } from '~/hooks/use-toast-fetch';
import { useTranslation } from '~/lib/i18n';
import { fetcher } from '~/lib/fetcher';
import { cn } from '~/lib/utils';

import type { Data } from '@asmr-collections/shared';

interface GenreEditorProps {
  workId: string;
  genres: Array<Data<number>>;
  exists?: boolean;
}

export function GenreEditor({ workId, genres, exists }: GenreEditorProps) {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();

  const [isEditing, setIsEditing] = useState(false);
  const [pendingGenres, setPendingGenres] = useState<Array<Data<number>>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all available genres
  const { data: allGenres } = useSWR<Array<Data<number>>>(
    isEditing ? 'field-genre' : null,
    () => fetcher<Array<Data<number>>>('/api/field/genre')
  );

  const [toastcher, isMutating] = useToastMutation<unknown>('update-genres');

  // Filter available genres (exclude already selected ones)
  const filteredGenres = useMemo(() => {
    if (!allGenres) return [];

    const pendingIds = new Set(pendingGenres.map(g => g.id));
    const available = allGenres.filter(g => !pendingIds.has(g.id));

    if (!inputValue.trim()) return available;

    return available.filter(g =>
      g.name.toLowerCase().includes(inputValue.trim().toLowerCase())
    );
  }, [allGenres, pendingGenres, inputValue]);

  // Check if input value matches an existing genre
  const inputMatchesExisting = useMemo(() => {
    if (!inputValue.trim()) return true;
    if (!allGenres) return false;

    return allGenres.some(g =>
      g.name.toLowerCase() === inputValue.trim().toLowerCase()
    );
  }, [allGenres, inputValue]);

  // Show "Create" option when input doesn't match any genre
  const showCreateOption = inputValue.trim().length > 0 && !inputMatchesExisting;

  // Total options count (filtered + create option if shown)
  const totalOptions = filteredGenres.length + (showCreateOption ? 1 : 0);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredGenres.length, showCreateOption]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll('[data-genre-option]');
    const item = items[highlightedIndex];
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setPendingGenres([...genres]);
    setInputValue('');
    setIsDropdownOpen(false);
  }, [genres]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setPendingGenres([]);
    setInputValue('');
    setIsDropdownOpen(false);
  }, []);

  const addGenre = useCallback((genre: Data<number>) => {
    setPendingGenres(prev => {
      if (prev.some(g => g.id === genre.id)) return prev;
      return [...prev, genre];
    });
    setInputValue('');
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }, []);

  const createAndAddGenre = useCallback((name: string) => {
    // Use negative IDs for new genres (server will assign real ID >= 9000)
    const tempId = -(Date.now());
    setPendingGenres(prev => [...prev, { id: tempId, name: name.trim() }]);
    setInputValue('');
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }, []);

  const removeGenre = useCallback((genreId: number) => {
    setPendingGenres(prev => prev.filter(g => g.id !== genreId));
  }, []);

  const saveGenres = useCallback(() => {
    toastcher({
      key: `/api/work/update/genres/${workId}`,
      fetchOps: {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genres: pendingGenres })
      },
      toastOps: {
        loading: t('标签更新中...'),
        success: t('标签更新成功'),
        error: t('标签更新失败'),
        async finally() {
          await mutate(`work-info-${workId}`);
          setIsEditing(false);
          setPendingGenres([]);
          setInputValue('');
          setIsDropdownOpen(false);
        }
      }
    });
  }, [workId, pendingGenres, toastcher, mutate, t]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || totalOptions === 0) {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % totalOptions);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + totalOptions) % totalOptions);
        break;
      case 'Enter':
        e.preventDefault();
        if (showCreateOption && highlightedIndex === filteredGenres.length) {
          createAndAddGenre(inputValue);
        } else if (highlightedIndex < filteredGenres.length) {
          addGenre(filteredGenres[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        break;
    }
  }, [isDropdownOpen, totalOptions, highlightedIndex, filteredGenres, showCreateOption, inputValue, addGenre, createAndAddGenre]);

  // View mode: show genres as badges
  if (!isEditing) {
    return (
      <div className="inline-flex flex-wrap gap-2 mt-auto items-center">
        {genres.map(genre => (
          <Badge key={genre.id} asChild variant="info" size="lg" className="hover:opacity-90 transition-opacity">
            <Link to="/" search={{ genres: [genre.id] }}>
              <TagIcon />
              {genre.name}
            </Link>
          </Badge>
        ))}
        {exists !== false && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-muted-foreground hover:text-foreground"
            onClick={startEditing}
          >
            <PencilIcon className="size-3.5" />
            {t('编辑标签')}
          </Button>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="flex flex-col gap-2 mt-auto" ref={containerRef}>
      {/* Pending genres as removable badges */}
      <div className="inline-flex flex-wrap gap-1.5">
        {pendingGenres.map(genre => (
          <Badge
            key={genre.id}
            variant="info"
            size="lg"
            className="gap-1 pr-1"
          >
            <TagIcon />
            {genre.name}
            <button
              type="button"
              className="ml-0.5 rounded-sm hover:bg-white/20 transition-colors p-0.5 cursor-pointer"
              onClick={() => removeGenre(genre.id)}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input with dropdown */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('搜索或创建标签...')}
          className="h-8 text-sm"
          autoFocus
        />

        {/* Dropdown */}
        {isDropdownOpen && (filteredGenres.length > 0 || showCreateOption) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full mt-1 left-0 w-full max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
          >
            {filteredGenres.map((genre, index) => (
              <div
                key={genre.id}
                data-genre-option
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none',
                  index === highlightedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={e => {
                  e.preventDefault();
                  addGenre(genre);
                }}
              >
                <TagIcon className="size-3.5 shrink-0 text-muted-foreground" />
                {genre.name}
              </div>
            ))}

            {showCreateOption && (
              <div
                data-genre-option
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none',
                  highlightedIndex === filteredGenres.length
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
                onMouseEnter={() => setHighlightedIndex(filteredGenres.length)}
                onMouseDown={e => {
                  e.preventDefault();
                  createAndAddGenre(inputValue);
                }}
              >
                <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" />
                {t("创建 '{name}'", { name: inputValue.trim() })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save / Cancel buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-7 gap-1"
          onClick={saveGenres}
          disabled={isMutating}
        >
          <CheckIcon className="size-3.5" />
          {t('保存')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1"
          onClick={cancelEditing}
          disabled={isMutating}
        >
          {t('取消')}
        </Button>
      </div>
    </div>
  );
}
