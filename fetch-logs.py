import subprocess, json, sys

result = subprocess.run(
    ['aws', 'logs', 'get-log-events',
     '--log-group-name', '/ecs/psychic-chat-api-production',
     '--log-stream-name', 'api/api/90080f58587c40da8f996fd42e53ba1c',
     '--limit', '200',
     '--output', 'json'],
    capture_output=True
)

raw = result.stdout.decode('utf-8', errors='replace')
if not raw.strip():
    print("No output from AWS CLI")
    print("STDERR:", result.stderr.decode('utf-8', errors='replace')[:500])
    sys.exit(1)

try:
    data = json.loads(raw)
except Exception as e:
    print("JSON parse error:", e)
    print("Raw (first 500):", raw[:500])
    sys.exit(1)

events = data.get('events', [])
print(f"Total events: {len(events)}")
for e in events:
    msg = e['message']
    if any(kw in msg for kw in ['HOROSCOPE', 'dotenv', 'horoscope', 'error', 'Error', 'ERROR']):
        print(msg[:400])
