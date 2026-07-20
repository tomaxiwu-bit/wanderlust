"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchPlaces, inferPlaceType, type GeoSearchResult } from "@/lib/geocode";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceType } from "@/types";

interface PlaceSearchProps {
  /** 选中搜索结果后的回调 */
  onSelect: (result: {
    name: string;
    type: PlaceType;
    address: string;
    lat: number;
    lng: number;
  }) => void;
  /** 搜索时聚焦的区域（可选） */
  viewbox?: string;
  /** 占位符文本 */
  placeholder?: string;
}

export function PlaceSearch({
  onSelect,
  viewbox,
  placeholder = "搜索地点，如：东京塔、浅草寺...",
}: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 防抖搜索
  const handleSearch = useCallback(
    (searchQuery: string) => {
      // 取消上一次的防抖
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      // 取消上一次的请求
      if (abortControllerRef.current) abortControllerRef.current.abort();

      if (searchQuery.trim().length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      debounceTimer.current = setTimeout(async () => {
        setLoading(true);
        setShowDropdown(true);

        // 创建新的 AbortController 用于取消本次请求
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const searchResults = await searchPlaces(searchQuery, {
            limit: 6,
            viewbox,
            signal: controller.signal,
          });
          // 如果请求已被取消，不更新状态
          if (controller.signal.aborted) return;
          setResults(searchResults);
          setHighlightedIndex(-1);
        } catch (err) {
          // AbortError 是正常的取消行为，不打印
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error("搜索失败:", err);
          setResults([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }, 500); // 500ms 防抖
    },
    [viewbox]
  );

  // 清理
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: GeoSearchResult) => {
    const inferredType = inferPlaceType(result.category, result.type);
    onSelect({
      name: result.name,
      type: inferredType,
      address: result.displayName,
      lat: result.lat,
      lng: result.lon,
    });
    setQuery(result.name);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setShowDropdown(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 下拉结果 */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          {loading && results.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              搜索中...
            </div>
          )}

          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              未找到相关地点
            </div>
          )}

          {results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((result, index) => (
                <li key={result.placeId}>
                  <button
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                      highlightedIndex === index
                        ? "bg-secondary"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {result.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.displayName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                          {result.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
