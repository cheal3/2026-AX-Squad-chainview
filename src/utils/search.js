export function normalizeSearchText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function searchableText(...values) {
  return normalizeSearchText(values.flat(Infinity).filter(Boolean).join(" "));
}

export function matchesSearchText(haystack, keyword) {
  const normalizedKeyword = normalizeSearchText(keyword);
  if (!normalizedKeyword) return true;

  const normalizedHaystack = normalizeSearchText(haystack);
  if (normalizedHaystack.includes(normalizedKeyword)) return true;

  const haystackInitials = hangulInitials(normalizedHaystack);
  const keywordInitials = hangulInitials(normalizedKeyword);
  return Boolean(
    haystackInitials &&
      keywordInitials &&
      haystackInitials.includes(keywordInitials)
  );
}

export function hangulInitials(value) {
  const initials = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
    "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
  ];
  return Array.from(String(value ?? "")).map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      return initials[Math.floor((code - 0xac00) / 588)];
    }
    return char;
  }).join("");
}
