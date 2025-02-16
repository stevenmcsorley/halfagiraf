#!/usr/bin/env python3
import os
import time
import json
import random
import requests
import psycopg2

# Database configuration (adjust as needed)
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

# API configuration for enrichment
NEW_API_KEY = "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"
MODEL_ID = "llama-3.3-70b-versatile"  # Adjust as needed

def create_origin_enrichment_table():
    """Ensure the origin_enrichment table exists."""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS origin_enrichment (
            origin TEXT PRIMARY KEY,
            enriched_content JSONB DEFAULT '{}'::jsonb,
            last_updated TIMESTAMP DEFAULT NOW()
        );
    """)
    conn.commit()

def fetch_distinct_origins():
    """
    Retrieve a list of distinct origins from the baby_names table.
    """
    cur.execute("""
        SELECT DISTINCT origin
        FROM baby_names
        WHERE origin != ''
    """)
    rows = cur.fetchall()
    return [row[0] for row in rows]

def is_origin_enriched(origin):
    """
    Check if an origin already has enriched content.
    """
    cur.execute("""
        SELECT enriched_content
        FROM origin_enrichment
        WHERE origin = %s
    """, (origin,))
    row = cur.fetchone()
    # If no row exists or the JSON content is empty, consider it not enriched.
    if row is None or row[0] == {}:
        return False
    return True

def update_origin_enrichment(origin, enriched_content):
    """
    Insert or update the enrichment data for an origin.
    """
    cur.execute("""
        INSERT INTO origin_enrichment (origin, enriched_content, last_updated)
        VALUES (%s, %s, NOW())
        ON CONFLICT (origin) DO UPDATE
          SET enriched_content = EXCLUDED.enriched_content,
              last_updated = EXCLUDED.last_updated
    """, (origin, json.dumps(enriched_content)))
    conn.commit()

def call_origin_enrichment_api(origin):
    """
    Call the Groq API to generate SEO-rich content about the given origin.
    Implements exponential backoff for rate limiting.
    """
    system_instruction = (
        "You are an API that returns valid JSON with no markdown. "
        "When given an origin name, generate a detailed, interesting, factual, "
        "and SEO-rich description of that origin. "
        "Focus on historical background, cultural significance, and unique trends "
        "associated with this origin in the context of baby names. "
        "Return a JSON object with a single key 'origin_overview' whose value is an object "
        "with properties like 'paragraph1', 'paragraph2', etc. "
        "Do not include any extra text or explanation."
    )

    user_prompt = (
        f"Provide a detailed, interesting, and SEO-rich description about the following origin:\n"
        f"Origin: {origin}\n\n"
        "Generate a JSON object exactly as follows:\n"
        "{\n"
        '  "origin_overview": { "paragraph1": "...", "paragraph2": "..." }\n'
        "}\n"
        "Return only the JSON object."
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
        "Authorization": f"Bearer {NEW_API_KEY}"
    }

    max_retries = 5
    attempt = 0
    backoff = 10  # initial delay in seconds

    while attempt < max_retries:
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=60
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("choices"):
                print(f"No choices returned for origin: {origin}")
                return None
            raw_content = data["choices"][0]["message"]["content"]
            # Remove any markdown if present
            raw_content = raw_content.replace("```json", "").replace("```", "").strip()
            result = json.loads(raw_content)
            if not isinstance(result, dict):
                print(f"Expected a JSON object for origin: {origin}")
                return None
            return result
        except requests.exceptions.HTTPError as e:
            if resp.status_code == 429:
                attempt += 1
                retry_after = resp.headers.get("Retry-After")
                delay = int(retry_after) if retry_after is not None else backoff
                print(f"Rate limited for {origin}, attempt {attempt}/{max_retries}. Retrying in {delay} seconds...")
                time.sleep(delay)
                backoff *= 2  # Exponential backoff
                continue
            else:
                print(f"Error processing {origin}: {e}")
                return None
        except Exception as e:
            print(f"Error processing {origin}: {e}")
            return None

    print(f"Exceeded maximum retries for {origin}.")
    return None

def main():
    # Ensure our origin_enrichment table exists.
    create_origin_enrichment_table()

    # Fetch distinct origins from the baby_names table.
    origins = fetch_distinct_origins()
    print(f"Found {len(origins)} distinct origins.")

    for origin in origins:
        if is_origin_enriched(origin):
            print(f"Skipping {origin}: already enriched.")
            continue

        print(f"Processing enrichment for origin: {origin}...")
        enriched_content = call_origin_enrichment_api(origin)
        if enriched_content:
            update_origin_enrichment(origin, enriched_content)
            print(f"Updated enriched content for {origin}.")
        else:
            print(f"Skipping {origin} due to API error.")
        # Sleep for a random delay between 2 and 5 minutes to respect rate limits.
        delay = random.randint(120, 300)
        print(f"Sleeping for {delay} seconds before processing next origin...")
        time.sleep(delay)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted. Closing DB connection.")
    finally:
        cur.close()
        conn.close()
