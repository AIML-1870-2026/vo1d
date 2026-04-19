let _apiKey = null;

export function parseEnvFile(text) {
  for (const line of text.split('\n')) {
    const clean = line.replace(/^export\s+/, '').trim();
    const match = clean.match(/^OPENAI_API_KEY\s*=\s*["']?([^"'\s]+)["']?/);
    if (match) {
      _apiKey = match[1];
      return true;
    }
  }
  return false;
}

export function getApiKey() {
  return _apiKey;
}

export function setApiKey(key) {
  _apiKey = key || null;
}

export function clearApiKey() {
  _apiKey = null;
}
