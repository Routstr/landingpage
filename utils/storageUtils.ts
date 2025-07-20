export interface CashuTokenEntry {
  baseUrl: string;
  token: string;
}

const LOCAL_CASHU_TOKENS_KEY = 'local_cashu_tokens';

export const getLocalCashuTokens = (): CashuTokenEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(LOCAL_CASHU_TOKENS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error parsing local cashu tokens from localStorage:', error);
    return [];
  }
};

export const setLocalCashuTokens = (tokens: CashuTokenEntry[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LOCAL_CASHU_TOKENS_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Error saving local cashu tokens to localStorage:', error);
  }
};

export const getLocalCashuToken = (baseUrl: string): string | null => {
  const tokens = getLocalCashuTokens();
  const found = tokens.find(entry => entry.baseUrl === baseUrl);
  return found ? found.token : null;
};

export const setLocalCashuToken = (baseUrl: string, token: string): void => {
  const tokens = getLocalCashuTokens();
  const existingIndex = tokens.findIndex(entry => entry.baseUrl === baseUrl);

  if (existingIndex > -1) {
    tokens[existingIndex] = { baseUrl, token };
  } else {
    tokens.push({ baseUrl, token });
  }
  setLocalCashuTokens(tokens);
};

export const removeLocalCashuToken = (baseUrl: string): void => {
  const tokens = getLocalCashuTokens();
  const updatedTokens = tokens.filter(entry => entry.baseUrl !== baseUrl);
  setLocalCashuTokens(updatedTokens);
};