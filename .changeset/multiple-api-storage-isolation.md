---
'fumadocs-openapi': minor
---

Add `storageKey` option to isolate localStorage for multiple API instances

When using multiple `createOpenAPI()` instances in the same application, the server selection state would bleed between different APIs because they all shared the same hardcoded `'apiBaseUrl'` localStorage key.

**Changes:**
- Added `storageKey` parameter to `SharedOpenAPIOptions` interface
- Updated `ApiProvider` to accept and use custom storage keys
- Defaults to `'apiBaseUrl'` for backward compatibility

**Usage:**
```typescript
export const dataApi = createOpenAPI({
  input: ['./openapi/data.json'],
  storageKey: 'apiBaseUrl-data',
});

export const metricsApi = createOpenAPI({
  input: ['./openapi/metrics.json'],
  storageKey: 'apiBaseUrl-metrics',
});
```

Each API instance now maintains independent server selection state.

