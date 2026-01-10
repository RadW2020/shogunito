import React, { useState } from 'react';

interface JsonViewerProps {
  data: any;
  name?: string;
  defaultExpanded?: boolean;
  level?: number;
}

/**
 * Recursive JSON viewer component with collapsible nested fields
 */
export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  name,
  defaultExpanded = true,
  level = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isExpandable = isObject || isArray;
  const isEmpty = isExpandable && Object.keys(data).length === 0;

  const indent = level * 20;

  const toggleExpand = () => {
    if (isExpandable && !isEmpty) {
      setIsExpanded(!isExpanded);
    }
  };

  const renderValue = (value: any): React.ReactNode => {
    if (value === null) {
      return <span style={{ color: 'var(--json-null, #808080)' }}>null</span>;
    }
    if (value === undefined) {
      return <span style={{ color: 'var(--json-undefined, #808080)' }}>undefined</span>;
    }
    if (typeof value === 'string') {
      return <span style={{ color: 'var(--json-string, #22863a)' }}>"{value}"</span>;
    }
    if (typeof value === 'number') {
      return <span style={{ color: 'var(--json-number, #005cc5)' }}>{value}</span>;
    }
    if (typeof value === 'boolean') {
      return <span style={{ color: 'var(--json-boolean, #d73a49)' }}>{String(value)}</span>;
    }
    return String(value);
  };

  const getPreview = (): string => {
    if (isEmpty) {
      return isArray ? '[]' : '{}';
    }
    if (isArray) {
      return `[${data.length} ${data.length === 1 ? 'item' : 'items'}]`;
    }
    if (isObject) {
      const keys = Object.keys(data);
      return `{${keys.length} ${keys.length === 1 ? 'key' : 'keys'}}`;
    }
    return '';
  };

  if (!isExpandable) {
    return (
      <div
        className="json-viewer-line"
        style={{
          paddingLeft: `${indent}px`,
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.6',
        }}
      >
        {/* Spacer to align with expandable items that have arrows */}
        <span style={{ display: 'inline-block', width: '12px' }}></span>
        {name && (
          <>
            <span style={{ color: 'var(--json-key, #6f42c1)' }}>{name}</span>
            <span style={{ color: 'var(--text-secondary)' }}>: </span>
          </>
        )}
        {renderValue(data)}
      </div>
    );
  }

  return (
    <div className="json-viewer-expandable">
      <div
        className="json-viewer-line"
        onClick={toggleExpand}
        style={{
          paddingLeft: `${indent}px`,
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.6',
          cursor: isEmpty ? 'default' : 'pointer',
          userSelect: 'none',
        }}
      >
        {!isEmpty && (
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              color: 'var(--text-secondary)',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
        )}
        {isEmpty && <span style={{ display: 'inline-block', width: '12px' }}></span>}
        {name && (
          <>
            <span style={{ color: 'var(--json-key, #6f42c1)' }}>{name}</span>
            <span style={{ color: 'var(--text-secondary)' }}>: </span>
          </>
        )}
        <span style={{ color: 'var(--text-secondary)' }}>
          {isEmpty ? getPreview() : isExpanded ? (isArray ? '[' : '{') : getPreview()}
        </span>
      </div>

      {isExpanded && !isEmpty && (
        <div className="json-viewer-children">
          {isArray
            ? data.map((item: any, index: number) => (
                <JsonViewer
                  key={index}
                  data={item}
                  name={String(index)}
                  defaultExpanded={level < 1}
                  level={level + 1}
                />
              ))
            : Object.entries(data).map(([key, value]) => (
                <JsonViewer
                  key={key}
                  data={value}
                  name={key}
                  defaultExpanded={level < 1}
                  level={level + 1}
                />
              ))}
        </div>
      )}

      {isExpanded && !isEmpty && (
        <div
          className="json-viewer-line"
          style={{
            paddingLeft: `${indent}px`,
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ display: 'inline-block', width: '12px' }}></span>
          {isArray ? ']' : '}'}
        </div>
      )}
    </div>
  );
};
