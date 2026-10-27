"use client";
import { AddressCandidate } from "@/types/address";
import { useEffect, useState } from "react";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300; // wait for a pause in typing before asking the server

export default function AddressSearch({
  onSelect,
}: {
  onSelect: (candidate: AddressCandidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressCandidate[]>([]);
  const [searchedFor, setSearchedFor] = useState(""); // the query `results` belong to
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmed = query.trim();
  const enabled = trimmed.length >= MIN_CHARS;

  useEffect(() => {
    if (!enabled) return;

    // Cleanup runs on the next keystroke: drop the timer and cancel the request,
    // so only the latest query can ever fill the list.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/addresses/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (res.status === 401) {
          // A full page load on purpose: /session-expired is a route handler
          // (it deletes the cookie), not a page the client router can render.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/session-expired");
          return;
        }
        if (!res.ok) {
          setResults([]);
          setError(
            res.status === 503
              ? "Address search is unavailable right now."
              : "Something went wrong. Try again.",
          );
          return;
        }
        const data = await res.json();
        setResults(data.results);
        setSearchedFor(trimmed);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Something went wrong. Try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, enabled]);

  const showResults = enabled && !loading && !error && searchedFor === trimmed;

  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <label htmlFor="address-search">Search your address</label>
      <input
        id="address-search"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Street, number, city"
        className="rounded border border-zinc-300 px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="min-h-5 font-normal" aria-live="polite">
        {!enabled && (
          <span className="text-zinc-500">
            Type at least {MIN_CHARS} characters.
          </span>
        )}
        {enabled && loading && (
          <span className="text-zinc-500">Searching...</span>
        )}
        {enabled && error && <span className="text-red-600">{error}</span>}
        {showResults && results.length === 0 && (
          <span className="text-zinc-500">No matches. Try another spelling.</span>
        )}
      </div>
      {showResults && results.length > 0 && (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded border border-zinc-300 bg-white/60 font-normal backdrop-blur-sm dark:divide-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/60">
          {results.map((candidate) => (
            <li key={`${candidate.latitude},${candidate.longitude},${candidate.displayName}`}>
              <button
                type="button"
                onClick={() => onSelect(candidate)}
                className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {candidate.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
