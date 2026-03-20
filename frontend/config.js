/**
 * MedRAG — Configuration
 * Centralizes all runtime settings for the application.
 * Edit this file to change API endpoints, timeouts, and UI behaviour.
 */

const MEDRAG_CONFIG = {

  /* ── API ───────────────────────────────────────────────────────── */
  api: {
    /** Base URL for the RAG backend */
    baseUrl: "http://127.0.0.1:8000",

    /** Endpoint path for query submission */
    queryEndpoint: "/ask",

    /** Request timeout in milliseconds (0 = no timeout) */
    timeoutMs: 30000,

    /** HTTP method */
    method: "POST",

    /** Default headers sent with every request */
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  },

  /* ── UI Behaviour ──────────────────────────────────────────────── */
  ui: {
    /** Maximum characters allowed in the query textarea */
    maxQueryLength: 1000,

    /** Minimum characters before the submit button activates */
    minQueryLength: 3,

    /** Delay (ms) before loading subtext cycles to next message */
    loadingMessageIntervalMs: 2200,

    /** Number of milliseconds the "Copied!" toast stays visible */
    copyToastDurationMs: 2000,

    /** Animate sources with staggered delay (ms per card) */
    sourceStaggerDelayMs: 60,

    /** Maximum number of history entries to retain */
    maxHistoryEntries: 5,
  },

  /* ── Storage Keys ──────────────────────────────────────────────── */
  storage: {
    /** localStorage key for theme preference */
    themeKey: "medrag-theme",

    /** localStorage key for query history array */
    historyKey: "medrag-query-history",
  },

  /* ── Theme ─────────────────────────────────────────────────────── */
  theme: {
    /** Default theme: 'light' or 'dark' */
    default: "light",

    /** Label text for the toggle button in each mode */
    labels: {
      light: "Dark",   // shown in light mode → clicking switches to dark
      dark:  "Light",  // shown in dark mode  → clicking switches to light
    },
  },

  /* ── Loading Messages ──────────────────────────────────────────── */
  /** Cycled in order during API request */
  loadingMessages: [
    "Searching indexed documents",
    "Ranking evidence by relevance",
    "Extracting clinical context",
    "Synthesising response from sources",
    "Verifying citations",
  ],

  /* ── Category Display Names ────────────────────────────────────── */
  /** Maps raw API category strings → display labels */
  categoryLabels: {
    metabolic:    "Metabolic",
    cardiology:   "Cardiology",
    neurology:    "Neurology",
    oncology:     "Oncology",
    pharmacology: "Pharmacology",
    general:      "General",
    other:        "Other",
  },

  /* ── Placeholder Stat ──────────────────────────────────────────── */
  /** Value shown in the "Indexed Documents" hero stat */
  indexedDocumentsStat: "64",

};

/* Freeze the config so it cannot be mutated at runtime */
Object.freeze(MEDRAG_CONFIG);
Object.freeze(MEDRAG_CONFIG.api);
Object.freeze(MEDRAG_CONFIG.ui);
Object.freeze(MEDRAG_CONFIG.storage);
Object.freeze(MEDRAG_CONFIG.theme);
Object.freeze(MEDRAG_CONFIG.theme.labels);
