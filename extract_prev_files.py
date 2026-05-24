import json
import os
import re

transcript_path = r"C:\Users\MAYUR\.gemini\antigravity\brain\4ba7d65e-e50c-49ce-a93f-ce33270de3fa\.system_generated\logs\transcript.jsonl"
output_dir = r"c:\Users\MAYUR\Documents\CODEs\ai-doc-intilligence-frontend\docai-frontend\extracted_files"

os.makedirs(output_dir, exist_ok=True)
os.makedirs(os.path.join(output_dir, "js"), exist_ok=True)

files_content = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            # Check for tool_calls inside the MODEL response or PLANNER_RESPONSE
            tool_calls = data.get("tool_calls", [])
            for tc in tool_calls:
                if tc.get("name") == "write_to_file":
                    args = tc.get("args", {})
                    # sometimes args is a string representing json, sometimes it's a dict
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    target = args.get("TargetFile", "")
                    content = args.get("CodeContent", "")
                    
                    if target and content:
                        filename = os.path.basename(target.replace('\\', '/').strip('"'))
                        if filename in ["login.html", "register.html", "demo.html", "dashboard.html", "auth.js", "api.js"]:
                            files_content[filename] = content
        except Exception as e:
            pass

for fname, content in files_content.items():
    # If content starts and ends with double quotes, unescape it
    if content.startswith('"') and content.endswith('"'):
        # simple unescape or JSON load
        try:
            content = json.loads(content)
        except:
            content = content[1:-1].replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
    
    if fname in ["auth.js", "api.js"]:
        target_path = os.path.join(output_dir, "js", fname)
    else:
        target_path = os.path.join(output_dir, fname)
        
    with open(target_path, 'w', encoding='utf-8') as out_f:
        out_f.write(content)
    print(f"Extracted {fname} to {target_path}")
