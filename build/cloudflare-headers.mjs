const OAI_AUTHENTICATED_USER_HEADER_PREFIX = "oai-authenticated-user-";

export const SITES_AUTH_PATHS = new Set([
  "/signin-with-chatgpt",
  "/signout-with-chatgpt",
  "/callback",
]);

export function isSitesAuthPath(pathname) {
  return SITES_AUTH_PATHS.has(pathname);
}

export function stripOpenAiAuthenticatedUserHeaders(headers) {
  const clean = new Headers(headers);
  for (const name of Array.from(clean.keys())) {
    if (name.toLowerCase().startsWith(OAI_AUTHENTICATED_USER_HEADER_PREFIX)) {
      clean.delete(name);
    }
  }
  return clean;
}
