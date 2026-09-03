import re

auth_file = "src/lib/auth.ts"
with open(auth_file, "r") as f:
    content = f.read()

# Replace getAccessToken to always return Firebase ID token
old_get_token = """export const getAccessToken = async (): Promise<string> => {
  const oauthToken = localStorage.getItem('googleOAuthToken');
  if (oauthToken) {
    return oauthToken;
  }
  const user = auth.currentUser;
  if (user) {
    try {
      const idToken = await user.getIdToken();
      if (idToken) return idToken;
    } catch (e) {}
  }
  return 'dummy-token';
};"""

new_get_token = """export const getAccessToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (user) {
    try {
      const idToken = await user.getIdToken(true);
      if (idToken) return idToken;
    } catch (e) {}
  }
  return '';
};

export const getGoogleToken = (): string => {
  return localStorage.getItem('googleOAuthToken') || '';
};"""

content = content.replace(old_get_token, new_get_token)
with open(auth_file, "w") as f:
    f.write(content)

print("auth.ts patched")
