/**
 * Parse JSON from a model response, tolerating markdown code fences and
 * surrounding prose. Throws if no JSON value can be extracted.
 */
export function parseJsonResponse<T>(text: string): T {
  const candidate = extractJson(text);
  return JSON.parse(candidate) as T;
}

function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = (fenced ? fenced[1] : text) ?? text;

  const trimmed = body.trim();
  // Fast path: already a bare JSON value.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return sliceToMatching(trimmed);
  }

  // Otherwise find the first JSON-looking span.
  const objStart = trimmed.indexOf("{");
  const arrStart = trimmed.indexOf("[");
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  if (start === -1) {
    throw new Error("no JSON value found in AI response");
  }
  return sliceToMatching(trimmed.slice(start));
}

/** Slice from the opening bracket to its matching close. */
function sliceToMatching(s: string): string {
  const open = s[0];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.slice(0, i + 1);
    }
  }
  return s; // let JSON.parse surface the error
}
