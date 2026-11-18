import sys
import re

log_path = r"c:\Users\prakh\.gemini\antigravity\brain\8fe8752d-b22c-4384-978b-00d3e71b3f84\.system_generated\logs\overview.txt"

try:
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
except FileNotFoundError:
    print("Log not found")
    sys.exit()

output = []
recording = False
found_any = False

for line in lines:
    if "File Path:" in line and "new.tex" in line:
        recording = True
        output = []
        continue
    
    if recording:
        output.append(line)
        if "\\end{document}" in line:
            found_any = True
            break

if found_any:
    cleaned = []
    for l in output:
        l = l.rstrip('\n')
        m = re.match(r'^\d+:\s(.*)$', l)
        if m:
            cleaned.append(m.group(1))
        else:
            cleaned.append(l)
            
    start = 0
    for i, c in enumerate(cleaned):
        if "\\documentclass" in c:
            start = i
            break
            
    end = len(cleaned)
    for i in range(len(cleaned)-1, -1, -1):
        if "\\end{document}" in cleaned[i]:
            end = i + 1
            break
            
    final_text = "\n".join(cleaned[start:end])
    with open(r"c:\Users\prakh\OneDrive\Desktop\proj\FraudGuardAi\docs\Paper Review PDF\re.tex", "w", encoding="utf-8") as out:
        out.write(final_text)
    print("Extracted successfully!")
else:
    print("Could not find a full dump.")
