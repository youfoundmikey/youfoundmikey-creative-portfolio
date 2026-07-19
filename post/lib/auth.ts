// Edge-safe (WebCrypto only) so it works in middleware and route handlers.

export const SESSION_COOKIE = "post_session";

/**
 * The session token is a hash of the app password. Change the password,
 * every session dies. That's the entire session model — it's one user.
 */
export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`post-v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
