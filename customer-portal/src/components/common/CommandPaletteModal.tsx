import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  group: 'Actions' | 'Tickets';
  title: string;
  subtitle?: string;
  badge?: string;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [ticketSuggestions, setTicketSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state toggle
          const btn = document.getElementById('cmd-palette-trigger');
          if (btn) btn.click();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch search suggestions
  useEffect(() => {
    if (!query.trim()) {
      setTicketSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.getSuggestions(query.trim());
        setTicketSuggestions(res);
      } catch {
        setTicketSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Build items array
  const quickActions: CommandItem[] = [
    {
      id: 'action-new',
      group: 'Actions',
      title: 'Submit New Support Request',
      subtitle: 'Create a new issue ticket for customer support',
      badge: 'Action',
      onSelect: () => {
        navigate('/new-ticket');
        onClose();
      },
    },
    {
      id: 'action-active',
      group: 'Actions',
      title: 'View Active Requests',
      subtitle: 'Filter dashboard to open tickets requiring attention',
      badge: 'View',
      onSelect: () => {
        navigate('/?tab=active');
        onClose();
      },
    },
    {
      id: 'action-pending',
      group: 'Actions',
      title: 'Awaiting Your Reply',
      subtitle: 'Filter dashboard to tickets waiting on customer response',
      badge: 'View',
      onSelect: () => {
        navigate('/?tab=pending');
        onClose();
      },
    },
    {
      id: 'action-resolved',
      group: 'Actions',
      title: 'View Resolved History',
      subtitle: 'Access past resolved customer support tickets',
      badge: 'View',
      onSelect: () => {
        navigate('/?tab=resolved');
        onClose();
      },
    },
  ];

  if (!isOpen) return null;

  const searchItems: CommandItem[] = ticketSuggestions.map((item, idx) => ({
    id: `ticket-${idx}`,
    group: 'Tickets',
    title: item.text,
    subtitle: item.subtext || `Category: ${item.type}`,
    badge: item.type,
    onSelect: () => {
      if (item.ticketId) {
        navigate(`/ticket/${item.ticketId}`);
      } else {
        navigate('/');
      }
      onClose();
    },
  }));

  const allItems = query.trim() ? searchItems : quickActions;

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].onSelect();
      }
    }
  };

  return (
    <div
      className="heroui-command-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className="heroui-command-modal" onClick={(e) => e.stopPropagation()}>
        <div className="heroui-command-header">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="heroui-command-input"
            placeholder="Type a command or search requests... (Press Esc to exit)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInInput}
          />
          <span className="heroui-kbd">ESC</span>
        </div>

        <div className="heroui-command-body">
          {/* Quick Actions Group */}
          {quickActions.length > 0 && !query.trim() && (
            <div>
              <div className="heroui-command-group-title">Quick Actions</div>
              {quickActions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={item.id}
                    className={`heroui-command-item ${isSelected ? 'active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      item.onSelect();
                    }}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.subtitle && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {item.badge && <span className="heroui-chip heroui-chip-info">{item.badge}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Search Results Group or UX Empty State */}
          {query.trim() && searchItems.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="1.5"
                style={{ margin: '0 auto 0.5rem', display: 'block' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                No ticket found matching "{query}"
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Try searching by ID (e.g. 1001), category, or customer name.
              </div>
            </div>
          ) : query.trim() && (
            <div>
              <div className="heroui-command-group-title">Search Results</div>
              {searchItems.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={item.id}
                    className={`heroui-command-item ${isSelected ? 'active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      item.onSelect();
                    }}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.subtitle && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {item.badge && <span className="heroui-chip heroui-chip-info">{item.badge}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
