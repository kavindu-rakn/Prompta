"use client";

import { useId } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Visible label, e.g. "Search your vault". */
  label: string;
  placeholder: string;
  matchCount: number;
  totalCount: number;
}

export default function SearchBar({ value, onChange, label, placeholder, matchCount, totalCount }: SearchBarProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const statusId = `${id}-status`;
  const searching = value.trim().length > 0;

  return (
    <div role="search" style={{ marginBottom: "2rem" }}>
      <label
        htmlFor={inputId}
        style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" }}
      >
        {label}
      </label>

      <div className="search-field">
        <Search size={18} className="search-icon" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Escape clears, except mid-composition, where an IME uses it to
            // cancel the character being composed.
            if (e.key === "Escape" && !e.nativeEvent.isComposing && value) {
              e.preventDefault();
              onChange("");
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby={statusId}
        />
        {value && (
          <button type="button" className="search-clear" onClick={() => onChange("")} aria-label="Clear search">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Announced politely so screen reader users hear how many results remain. */}
      <p
        id={statusId}
        aria-live="polite"
        style={{ marginTop: "0.5rem", minHeight: "1.2em", fontSize: "0.8rem", opacity: 0.7, letterSpacing: "1px" }}
      >
        {searching ? `${matchCount} OF ${totalCount} ${totalCount === 1 ? "ENTRY" : "ENTRIES"} MATCH` : ""}
      </p>
    </div>
  );
}
