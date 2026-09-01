import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { HighlightText } from '../common/HighlightText';

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (search: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ searchQuery, onSearchChange }) => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<
    { type: string; text: string; subtext?: string; ticketId?: string }[]
  >([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  useEffect(() => {
    api.getSearchHistory().then(setSearchHistory).catch(() => {});
  }, []);

  // Fetch dynamic suggestions when query >= 1 char
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      setShowHistoryDropdown(true);
      api
        .getSuggestions(searchQuery.trim())
        .then((res) => {
          setSuggestions(res);
          setShowHistoryDropdown(true);
        })
        .catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
    }
    setActiveIndex(-1);
  }, [searchQuery]);

  const saveToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    api.addSearchHistory(trimmed).then(setSearchHistory).catch(() => {});
  };

  const removeFromHistory = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api.removeSearchHistory(itemToRemove).then(setSearchHistory).catch(() => {});
  };

  const clearSearchHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    api.clearSearchHistory().then(setSearchHistory).catch(() => {});
  };

  const isSuggestionMode = searchQuery.trim().length >= 1 && suggestions.length > 0;
  const navItemsCount = isSuggestionMode ? suggestions.length : searchHistory.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showHistoryDropdown && e.key === 'ArrowDown') {
      setShowHistoryDropdown(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < navItemsCount ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : navItemsCount - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < navItemsCount) {
        e.preventDefault();
        if (isSuggestionMode) {
          const selected = suggestions[activeIndex];
          onSearchChange(selected.text);
          saveToHistory(selected.text);
        } else {
          onSearchChange(searchHistory[activeIndex]);
        }
        setShowHistoryDropdown(false);
      } else {
        saveToHistory(searchQuery);
        setShowHistoryDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowHistoryDropdown(false);
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
      <svg
        style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className="form-control"
        style={{ paddingLeft: '2.25rem' }}
        placeholder="Search by ID, title, or description..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => setShowHistoryDropdown(true)}
        onBlur={() => {
          saveToHistory(searchQuery);
          setTimeout(() => setShowHistoryDropdown(false), 200);
        }}
        onKeyDown={handleKeyDown}
      />

      {showHistoryDropdown && (isSuggestionMode || searchHistory.length > 0) && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '42px',
            left: 0,
            right: 0,
            zIndex: 105,
            padding: '0.5rem 0',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-surface, #ffffff)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {isSuggestionMode ? (
            <>
              <div
                style={{
                  padding: '0.25rem 0.75rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                }}
              >
                SUGGESTIONS
              </div>
              {suggestions.map((item, index) => {
                const isSelected = index === activeIndex;
                return (
                  <div
                    key={index}
                    onClick={() => {
                      onSearchChange(item.text);
                      saveToHistory(item.text);
                      setShowHistoryDropdown(false);
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      backgroundColor: isSelected ? 'var(--color-bg-subtle, #f3f4f6)' : 'transparent',
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.type === 'category' ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                        <HighlightText text={item.text} query={searchQuery} />
                      </span>
                      {item.subtext && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '1.25rem' }}>
                          {item.subtext}
                        </span>
                      )}
                    </div>
                    <span className="badge" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', textTransform: 'capitalize' }}>
                      {item.type}
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div
                style={{
                  padding: '0.25rem 0.75rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>RECENT SEARCHES</span>
                <button
                  type="button"
                  onClick={clearSearchHistory}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                >
                  Clear All
                </button>
              </div>
              {searchHistory.map((item, index) => {
                const isSelected = index === activeIndex;
                return (
                  <div
                    key={index}
                    onClick={() => {
                      onSearchChange(item);
                      setShowHistoryDropdown(false);
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      backgroundColor: isSelected ? 'var(--color-bg-subtle, #f3f4f6)' : 'transparent',
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => removeFromHistory(item, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1rem', cursor: 'pointer', lineHeight: 1 }}
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
