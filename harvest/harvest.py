#!/usr/bin/env python3
import os
import random
import time
import json
import requests
import psycopg2

# ENV Variables or defaults (for Postgres)
DB_HOST = os.getenv("POSTGRES_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "baby_names")
DB_USER = os.getenv("POSTGRES_USER", "mydbuser")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "supersecret")

# Connect to Postgres
conn = psycopg2.connect(
    host=DB_HOST,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
cur = conn.cursor()

# YOUR SINGLE API KEY (no rotation).
# Replace with your newly acquired valid key:
API_KEY = "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"
MODEL_ID = "llama-3.3-70b-versatile"

GENDERS = ["any", "male", "female"]
ORIGINS = [
    "Latin","Greek","Hebrew","Norse","Celtic","Phoenician",
    "Albanian","Basque","Bulgarian","Catalan","Croatian","Czech","Danish","Dutch","English",
    "Finnish","French","Galician","German","Greek","Hungarian","Icelandic","Irish","Italian",
    "Latvian","Lithuanian","Macedonian","Maltese","Norwegian","Polish","Portuguese","Romanian",
    "Russian","Scottish","Serbian","Slovak","Slovenian","Spanish","Swedish","Welsh","Arabic",
    "Aramaic","Armenian","Assyrian","Azerbaijani","Berber","Coptic","Egyptian (Ancient)","Georgian",
    "Hebrew","Kurdish","Persian","Turkish","Bengali","Gujarati","Hindi","Kannada","Marathi","Nepali",
    "Odia (Oriya)","Punjabi","Sanskrit","Sinhala","Tamil","Telugu","Urdu","Chinese","Japanese","Korean",
    "Mongolian","Filipino (Tagalog)","Indonesian","Javanese","Khmer","Lao","Malay","Burmese (Myanmar)",
    "Thai","Vietnamese","Afrikaans","Amharic","Akan","Ewe","Igbo","Oromo","Shona","Somali","Swahili",
    "Xhosa","Yoruba","Zulu","Aboriginal Australian","Fijian","Hawaiian","Maori","Samoan","Tongan",
    "Native American (general)","Cherokee","Navajo","Lakota","Quechua","Aymara","Guarani","Mapuche",
]

def init_db():
    """
    Ensure the baby_names table exists.
    """
    cur.execute("""
    CREATE TABLE IF NOT EXISTS baby_names (
        name TEXT PRIMARY KEY,
        meaning TEXT,
        origin TEXT,
        famous_people TEXT,
        historic_figures TEXT,
        interesting_facts TEXT
    )
    """)
    conn.commit()

def store_name_in_db(result):
    """
    Insert a single name record into Postgres, ignoring duplicates.
    """
    name = result.get("name", "").strip()
    meaning = result.get("meaning", "").strip()
    origin = result.get("origin", "").strip()
    famous = ", ".join(result.get("famous_people", []))
    historic = ", ".join(result.get("historic_figures", []))
    facts = result.get("interesting_facts", "").strip()

    cur.execute("""
        INSERT INTO baby_names(name, meaning, origin, famous_people, historic_figures, interesting_facts)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (name) DO NOTHING
    """, (name, meaning, origin, famous, historic, facts))
    conn.commit()

def maybe_wait_for_limits(resp):
    """
    Parse rate limit headers to avoid surpassing daily/tokens usage.
    If near limit, we do a bigger sleep so we don't keep spamming with 429.
    """
    headers = resp.headers
    remaining_req = headers.get("x-ratelimit-remaining-requests")
    remaining_tokens = headers.get("x-ratelimit-remaining-tokens")
    reset_tokens = headers.get("x-ratelimit-reset-tokens")

    # If daily requests are nearly exhausted, we do a big sleep.
    if remaining_req is not None:
        r_req = int(float(remaining_req))
        if r_req < 10:
            print(f"Only {r_req} daily requests left! Sleeping 60s to slow down usage.")
            time.sleep(60)

    # If tokens per minute are low, parse the reset time and sleep.
    if remaining_tokens is not None and reset_tokens is not None:
        r_tokens = int(float(remaining_tokens))
        numeric_part = "".join(ch for ch in reset_tokens if ch.isdigit() or ch == '.')
        try:
            seconds_to_reset = float(numeric_part)
        except ValueError:
            seconds_to_reset = 5.0

        if r_tokens < 100:
            wait_time = max(1, int(seconds_to_reset))
            print(f"Only {r_tokens} tokens left. Sleeping {wait_time}s to let tokens reset.")
            time.sleep(wait_time)

def request_batch_of_names(num=10):
    """
    Make a single request to the chat completion endpoint.
    Return a list of baby name objects if successful, or None on error/429.
    """
    gender = random.choice(GENDERS)
    origin = random.choice(ORIGINS)

    system_instruction = (
        "You are an API that only returns valid JSON with no markdown. "
        "When the user requests baby names, you MUST return an array of objects in JSON. "
        "No extra text, no code fences."
    )

    user_prompt = (
        f"Generate {num} unique baby names for a {gender} child from {origin} origin. "
        "Return only a JSON array, like this:\n"
        "[\n  {\n    \"name\":\"\",\n    \"meaning\":\"\",\n    \"origin\":\"\",\n    \"famous_people\":[\"\"],\n    \"historic_figures\":[\"\"],\n    \"interesting_facts\":\"\"\n  },\n  ...\n]\n"
        "No extra text or explanation."
    )

    payload = {
        "model": MODEL_ID,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30
        )

        # Check rate-limit headers
        maybe_wait_for_limits(resp)

        # If we definitely see a 429, do a bigger sleep
        if resp.status_code == 429:
            print("Got 429 (Too Many Requests). Sleeping 90s then retry.")
            time.sleep(90)
            return None

        resp.raise_for_status()

        data = resp.json()

        if not data.get("choices"):
            print("No 'choices' in response:", data)
            return None

        raw_content = data["choices"][0]["message"]["content"]
        raw_content = raw_content.replace("```json", "").replace("```", "").strip()

        # Attempt to isolate the JSON array
        first_bracket = raw_content.find("[")
        last_bracket = raw_content.rfind("]")
        raw_content = raw_content[first_bracket:last_bracket+1]

        result = json.loads(raw_content)
        if not isinstance(result, list):
            print("Expected a JSON array, got something else.")
            return None
        return result

    except requests.exceptions.RequestException as e:
        print("Network or HTTP error:", e)
        time.sleep(10)
        return None
    except (ValueError, json.JSONDecodeError) as je:
        print("Error parsing JSON:", je)
        time.sleep(10)
        return None

def main_loop():
    init_db()
    while True:
        batch = request_batch_of_names(num=10)
        if not batch:
            print("Got empty or invalid batch. Retrying after short sleep...")
            time.sleep(5)
            continue

        for item in batch:
            if not item.get("name"):
                continue
            store_name_in_db(item)
            print("Stored:", item["name"])

        # Sleep a random delay between 5 and 10 minutes (300 to 600 seconds)
        delay = random.randint(300, 600)
        print(f"Sleeping for {delay} seconds before processing next batch...")
        time.sleep(delay)

if __name__ == "__main__":
    try:
        main_loop()
    except KeyboardInterrupt:
        print("Stopping. Closing DB.")
    finally:
        cur.close()
        conn.close()
