import os
import re

directory = r"c:\Users\HomePC\Downloads\W-COMMERCE PROJECT\frontend\src\components\admin\Dashboard"

for filename in os.listdir(directory):
    if filename.startswith("Admin") and filename.endswith("Studio.jsx"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        pattern = re.compile(
            r"setTimeout\(\(\) => \{ setProgress\(40\); setProgressText\('Verifying data\.\.\.'\); \}, 400\);\s*"
            r"const res = await axios\.post\('([^']+)', \{\}\);\s*"
            r"setProgress\(80\);\s*"
            r"setProgressText\('Finalizing\.\.\.'\);\s*"
            r"setTimeout\(\(\) => \{\s*"
            r"setIsSubmitting\(false\);\s*"
            r"setProgress\(100\);\s*"
            r"setStep\('success'\);\s*"
            r"\}, 500\);"
        )
        
        def replacer(match):
            url = match.group(1)
            return (
                f"const res = await axios.post('{url}', {{}});\n"
                f"      setProgress(100);\n"
                f"      setIsSubmitting(false);\n"
                f"      setStep('success');"
            )
            
        new_content, count = pattern.subn(replacer, content)
        if count > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filename}")
        else:
            print(f"No match in {filename}")
