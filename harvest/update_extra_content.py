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

# New API key for the enrichment process
NEW_API_KEY = "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"
MODEL_ID = "llama-3.3-70b-versatile"  # or whichever model you're using

def update_enriched_fields(name, enriched_data):
    """
    Update the record for a given name with enriched JSON content.
    """
    cur.execute(
        """
        UPDATE baby_names SET
          in_depth_meaning = %s,
          historical_background = %s,
          cultural_significance = %s,
          seo_enriched_description = %s,
          detailed_interesting_facts = %s
        WHERE name = %s
        """,
        (
            json.dumps(enriched_data.get("in_depth_meaning", {})),
            json.dumps(enriched_data.get("historical_background", {})),
            json.dumps(enriched_data.get("cultural_significance", {})),
            json.dumps(enriched_data.get("seo_enriched_description", {})),
            json.dumps(enriched_data.get("detailed_interesting_facts", {})),
            name
        )
    )
    conn.commit()

def fetch_names_to_update():
    """
    Fetch all baby names along with their basic and enrichment data.
    Optionally, you might add a WHERE clause to select only records needing update.
    """
    cur.execute("""
        SELECT 
          name, 
          meaning, 
          origin, 
          famous_people, 
          historic_figures, 
          interesting_facts,
          in_depth_meaning, 
          historical_background, 
          cultural_significance, 
          seo_enriched_description, 
          detailed_interesting_facts
        FROM baby_names
    """)
    return cur.fetchall()

def call_enrichment_api(name, meaning, origin, famous_people, historic_figures, interesting_facts):
    """
    Call the Groq API to generate enriched content with rate limiting.
    This version implements exponential backoff (with optional Retry-After support)
    to reduce 429 errors.
    """
    system_instruction = (
        "You are an API that returns valid JSON with no markdown. "
        "When given basic baby name data, generate additional enriched content. "
        "Return a JSON object with the following keys: "
        "'in_depth_meaning', 'historical_background', 'cultural_significance', "
        "'seo_enriched_description', 'detailed_interesting_facts'. "
        "For each key, return an object where each property is a paragraph, e.g. 'paragraph1', 'paragraph2', etc. "
        "Do not include extra text or explanation."
    )

    user_prompt = (
        f"Enhance the following baby name data with detailed, interesting, and SEO-rich content:\n"
        f"Name: {name}\n"
        f"Meaning: {meaning}\n"
        f"Origin: {origin}\n"
        f"Famous People: {famous_people}\n"
        f"Historical Figures: {historic_figures}\n"
        f"Interesting Facts: {interesting_facts}\n\n"
        "Generate a JSON object exactly as follows:\n"
        "{\n"
        '  "in_depth_meaning": { "paragraph1": "...", "paragraph2": "..." },\n'
        '  "historical_background": { "paragraph1": "..." },\n'
        '  "cultural_significance": { "paragraph1": "..." },\n'
        '  "seo_enriched_description": { "paragraph1": "..." },\n'
        '  "detailed_interesting_facts": { "paragraph1": "...", "paragraph2": "..." }\n'
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
                print("No choices returned for", name)
                return None
            raw_content = data["choices"][0]["message"]["content"]
            # Remove any markdown if present
            raw_content = raw_content.replace("```json", "").replace("```", "").strip()
            result = json.loads(raw_content)
            if not isinstance(result, dict):
                print("Expected a JSON object for", name)
                return None
            return result
        except requests.exceptions.HTTPError as e:
            if resp.status_code == 429:
                attempt += 1
                # Check for Retry-After header; use it if available
                retry_after = resp.headers.get("Retry-After")
                delay = int(retry_after) if retry_after is not None else backoff
                print(f"Rate limited for {name}, attempt {attempt}/{max_retries}. Retrying in {delay} seconds...")
                time.sleep(delay)
                backoff *= 2  # Exponential backoff
                continue
            else:
                print(f"Error processing {name}: {e}")
                return None
        except Exception as e:
            print(f"Error processing {name}: {e}")
            return None

    print(f"Exceeded maximum retries for {name}.")
    return None

def main():
    records = fetch_names_to_update()
    for record in records:
        (
            name, meaning, origin, famous_people, historic_figures, interesting_facts,
            in_depth_meaning, historical_background, cultural_significance,
            seo_enriched_description, detailed_interesting_facts
        ) = record

        # Check if enrichment fields are already populated.
        # If any of the new JSON fields are not empty (i.e. not {}), skip updating.
        if (in_depth_meaning != {} or historical_background != {} or 
            cultural_significance != {} or seo_enriched_description != {} or 
            detailed_interesting_facts != {}):
            print(f"Skipping {name}: already enriched")
            continue

        print(f"Processing {name}...")
        enriched_data = call_enrichment_api(name, meaning, origin, famous_people, historic_figures, interesting_facts)
        if enriched_data:
            update_enriched_fields(name, enriched_data)
            print(f"Updated enriched content for {name}.")
        else:
            print(f"Skipping {name} due to API error.")
        # Sleep a random delay between 2 and 5 minutes.
        delay = random.randint(120, 300)
        print(f"Sleeping for {delay} seconds before processing next record...")
        time.sleep(delay)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted. Closing DB connection.")
    finally:
        cur.close()
        conn.close()
