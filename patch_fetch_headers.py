import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # ensure getGoogleToken is imported if getAccessToken is
    if 'getAccessToken' in content and 'getGoogleToken' not in content:
        content = re.sub(r'import\s+\{([^}]*)getAccessToken([^}]*)\}\s+from\s+[\'"]\.\./lib/auth[\'"]', 
                         r'import {\1getAccessToken, getGoogleToken\2} from "../lib/auth"', content)
        
        # for App.tsx where auth is in ./lib/auth
        content = re.sub(r'import\s+\{([^}]*)getAccessToken([^}]*)\}\s+from\s+[\'"]\./lib/auth[\'"]', 
                         r'import {\1getAccessToken, getGoogleToken\2} from "./lib/auth"', content)

    # Replace headers: { 'Authorization': `Bearer ${token}` } 
    # With headers: { 'Authorization': `Bearer ${token}`, 'x-google-oauth-token': getGoogleToken() }
    
    # We will use regex to find 'Authorization': `Bearer ${token}` and append the extra header.
    # Note: the variable name might be 'token' or 'accessToken' or something else, but we can just use getGoogleToken() directly.
    content = re.sub(r'([\'"]?Authorization[\'"]?\s*:\s*`Bearer\s+\$\{[^}]+\}`)', 
                     r'\1, "x-google-oauth-token": getGoogleToken()', content)
                     
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            filepath = os.path.join(root, f)
            with open(filepath, 'r') as file:
                if 'getAccessToken' in file.read():
                    process_file(filepath)

print("Fetch headers patched")
