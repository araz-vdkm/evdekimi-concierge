import re

with open('src/components/Home.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'\s*<button\s*onClick=\{.*?onSelectView\(\'maintenance\'\).*?</button>\s*\{currentUser &&.*?<button\s*onClick=\{.*?onSelectView\(\'minibar\'\).*?</button>\s*\)\}\s*<button onClick=\{.*?fetchReservations\(true\).*?</button>',
    re.DOTALL
)

content = pattern.sub('', content)

with open('src/components/Home.tsx', 'w') as f:
    f.write(content)

