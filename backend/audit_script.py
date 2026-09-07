import os
import re

src_dir = r'c:\Users\HomePC\Downloads\W-COMMERCE PROJECT\backend\src\controllers'

for root, _, files in os.walk(src_dir):
    for f in files:
        if not f.endswith('.js'): continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            # find async functions
            funcs = re.finditer(r'exports\.\w+\s*=\s*async\s*\([^)]*\)\s*=>\s*\{', content)
            for match in funcs:
                func_start = match.end()
                # find the matching closing brace
                open_braces = 1
                i = func_start
                while i < len(content) and open_braces > 0:
                    if content[i] == '{': open_braces += 1
                    elif content[i] == '}': open_braces -= 1
                    i += 1
                func_body = content[func_start:i]
                if 'try {' not in func_body and 'try{' not in func_body:
                    print(f'{f}: missing try/catch in {match.group(0).strip()}')
