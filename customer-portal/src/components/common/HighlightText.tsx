import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query }) => {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            style={{
              backgroundColor: 'rgba(250, 204, 21, 0.4)',
              color: 'inherit',
              padding: '0 2px',
              borderRadius: '2px'
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};
