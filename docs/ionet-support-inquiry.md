# io.net Chat Completions API – Inconsistent response format (reasoning models)

**Subject:** Intermittent missing `message.content` with model `openai/gpt-oss-120b` – same request sometimes returns only `reasoning_content`

---

## Summary

We use your Chat Completions API with model **`openai/gpt-oss-120b`** for a product-selection use case. We send the same request (same `messages`, `max_tokens: 1024`, no `response_format`) multiple times. **Sometimes the response includes `message.content` with the final answer (JSON); sometimes `message.content` is `null` and only `message.reasoning_content` is present** (reasoning text, often without the final JSON or with it truncated). Retrying the same request often returns a response with `content` populated. This inconsistency makes it hard to rely on the API without implementing retries and fallbacks.

**Questions:**

1. For reasoning models, is `message.content` guaranteed to be populated when the model successfully completes and produces a final answer? If not, is there a recommended parameter or practice to get a stable final answer (e.g. in `content`)?
2. Is the intermittent `content: null` (with only `reasoning_content` present) a known issue or expected under certain conditions (e.g. load, truncation)?

We’d appreciate any guidance so we can depend on a consistent response shape or document the intended behaviour on our side.

---

## Request we send (unchanged across calls)

- **Endpoint:** `POST /api/v1/chat/completions` (OpenAI-compatible)
- **Headers:** `Authorization: Bearer <API_KEY>`, `Content-Type: application/json`
- **Body:**
  - `model`: `"openai/gpt-oss-120b"`
  - `messages`: `[{ "role": "system", "content": "<system prompt>" }, { "role": "user", "content": "Query: \"teracell punjace\"\n\nCandidates:\n<list of product entries>" }]`
  - `max_tokens`: `1024`
  - No `response_format` (plain text)

We run this **same request** repeatedly (e.g. 5 times with a short delay). Response structure varies as below.

---

## Sample responses we receive

### Case A – Response with `message.content` (works for us)

When everything works, we get both `reasoning_content` and `content`. We use `content` as the final answer (e.g. JSON).

```json
{
  "id": "019ce902-c4f9-320c-28fb-533a43b7000a",
  "object": "chat.completion",
  "created": 1773435791,
  "model": "openai/gpt-oss-120b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "reasoning_content": "We need to match query \"Teracell kućni punjači\" i.e., Teracell home chargers. All candidates that are home chargers (kućni punjač) and brand Teracell. Must select indices.\n\nWe must be inclusive but limit to at most 8 indices. There are many; need to choose up to 8 that match. Probably pick first 8 relevant.\n\nList all entries with name containing \"Kućni punjač Teracell\". Let's enumerate indices:\n\n5024, 4955, 4959, 5000, 5030, 4954, 4956, 4957, ...\n\nReturn JSON with these indices.\n\nProvide reasoning sentence.\n\n",
        "content": "{\"indices\":[5024,4955,4959,5000,5030,4954,4956,4957],\"reasoning\":\"All selected items are Teracell home (kućni) chargers matching the query.\"}",
        "tool_calls": [],
        "refusal": null
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 6426,
    "completion_tokens": 498,
    "total_tokens": 6924
  },
  "provider": "ai.io.net"
}
```

Here we can parse `message.content` and use the JSON. This is the behaviour we rely on.

---

### Case B – Response with `message.content` = null (only `reasoning_content`)

On other calls with the **same request**, we receive a response where `message.content` is `null` and only `message.reasoning_content` is present. The reasoning text sometimes ends before the final JSON, or the JSON is not present at all, so we cannot obtain a structured final answer.

```json
{
  "id": "019ce8ed-844d-8992-2668-5fdb9181bdfb",
  "object": "chat.completion",
  "created": 1773434401,
  "model": "openai/gpt-oss-120b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "reasoning_content": "We need to match query \"Teracell kućni punjači\". So category: \"Teracell\" brand and \"kućni punjači\" meaning home chargers (wall chargers). So we need to include all candidates that are Teracell brand and are home chargers (Kućni punjač / Kućni i Auto punjač? Probably only \"Kućni punjač\". Also perhaps \"Kućni i Auto punjač\" also qualifies as a home charger? The query is \"kućni punjači\" (home chargers). I'd include only those whose name contains \"Kućni punjač\" and brand Teracell. Many entries have that. Also there is \"Auto Punjac Teracell...\" - not matching because it's auto charger, not home. Also there are \"Kućni i Auto punjač Teracell...\" like index 4966, 4965 etc. Those are both home and auto; they could be considered match since they are also home chargers. Probably include them as they contain \"Kućni i Auto punjač\". The rule: match category and any specified brand/model/term. Since query doesn't specify a mo",
        "content": null,
        "tool_calls": [],
        "refusal": null
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 6426, "completion_tokens": 498, "total_tokens": 6924 },
  "provider": "ai.io.net"
}
```

In this case we have no `content` to parse; only reasoning text that may be truncated. Retrying the same request often yields a response like **Case A** with `content` set.

---

## What we did on our side

- We always send the same request (same model, messages, max_tokens).
- We read the raw response body (we log and store the full JSON); we do not truncate or alter it.
- We prefer `message.content` when it is a non-empty string; otherwise we fall back to `message.reasoning_content` and try to extract a final answer (e.g. JSON) from it when possible.
- We implemented retries (e.g. up to 3 attempts) because of this inconsistency; the second or third attempt often returns a response with `content` populated.

We’d like to know whether this inconsistency is expected and how to use the API in a stable way (e.g. required parameters or recommended handling when `content` is null).

Thank you for your help.

---

## Attached sample files (optional)

If helpful, we can provide full raw response JSON files from multiple runs (same query “teracell punjace” / “teracell kućne punjače”, 5 calls each). They are saved under `.tmp/ionet-selectProducts/` in our project (e.g. `response-<timestamp>.json`). We can export a few “Case A” and “Case B” examples on request.
