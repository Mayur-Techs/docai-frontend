import json
import os

transcript_path = r"C:\Users\MAYUR\.gemini\antigravity\brain\4ba7d65e-e50c-49ce-a93f-ce33270de3fa\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            tool_calls = data.get("tool_calls", [])
            for tc in tool_calls:
                if tc.get("name") == "write_to_file":
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    target = args.get("TargetFile", "")
                    if any(x in target for x in [".html", ".js"]):
                        print(f"Step {data.get('step_index')}: target={target}")
        except Exception as e:
            pass
