import requests
import json
import os
import re
import time

# --- Configuration ---
SITUATIONS_FILE = "situations.txt"
# This is the prompt template you provided. The situation will be prepended to it.
QUESTION_GENERATION_PROMPT_TEMPLATE = """
Imagine you are the person in the following situation: you have no internet access, and you might be completely alone. You do, however, have an offline AI assistant on your phone. What specific, practical, and urgent questions would you ask it?

Task:
Generate a list of 15 to 20 questions. The questions should be varied and cover immediate actions, diagnostic queries, step-by-step procedures, and follow-up concerns.

Examples of question types:
- "What are the very first things I need to do right now?"
- "How can I tell if this is getting worse?"
- "Give me a step-by-step guide on how to [perform a specific task]."
- "What common mistakes should I avoid?"
- "What can I use as a substitute for [a specific tool or item]?"

Instruction:
List only the questions, ensuring they are numbered.
"""
# IMPORTANT: Update this list with the exact names of your local Ollama models
MODELS_TO_QUERY = [
    "gpt-oss",
    "llama3.1",
    "deepseek-r1",
    "mixtral"
]
OLLAMA_API_URL = "http://localhost:11434/api/generate"

def get_last_processed_situation_number(filename):
    """Reads an output file and finds the highest situation number processed."""
    if not os.path.exists(filename):
        return 0
    last_num = 0
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find all numbers that start a line and are followed by a period.
            found_numbers = re.findall(r'^\s*(\d+)\.', content, re.MULTILINE)
            if found_numbers:
                last_num = max(int(n) for n in found_numbers)
    except Exception as e:
        print(f"Warning: Could not parse {filename} to find last situation number. Starting from scratch. Error: {e}")
    return last_num

def get_questions_from_ollama(model_name, situation_text):
    """Sends a situation to a local Ollama model and gets generated questions."""
    # Construct the full prompt for the model
    full_prompt = f"Situation:\n{situation_text}\n\n{QUESTION_GENERATION_PROMPT_TEMPLATE}"
    
    payload = {
        "model": model_name,
        "prompt": full_prompt,
        "stream": False,
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=300) # 5 min timeout
        response.raise_for_status()
        response_json = response.json()
        return response_json.get("response", "").strip()
    except requests.exceptions.RequestException as e:
        print(f"\nError querying model '{model_name}': {e}")
        return None

def format_questions(raw_text):
    """Cleans and re-numbers the questions from the LLM's raw output."""
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    formatted_lines = []
    question_num = 1
    for line in lines:
        # Remove any existing list markers (bullets, numbers, etc.)
        cleaned_line = re.sub(r'^\s*[\*\-\•\d]+\.?\)?\s*', '', line)
        if cleaned_line: # Ensure the line is not empty after cleaning
            formatted_lines.append(f"{question_num}. {cleaned_line}")
            question_num += 1
    return "\n".join(formatted_lines)

# --- Main Script Logic ---
if __name__ == "__main__":
    print("Starting question generation process...")

    # 1. Read all situations from the file
    try:
        with open(SITUATIONS_FILE, 'r', encoding='utf-8') as f:
            situations = [line.strip() for line in f if line.strip()]
        if not situations:
            print(f"Error: No situations found in '{SITUATIONS_FILE}'.")
            exit()
        print(f"Loaded {len(situations)} situations from '{SITUATIONS_FILE}'.")
    except FileNotFoundError:
        print(f"Error: The file '{SITUATIONS_FILE}' was not found.")
        exit()

    # 2. Loop through each model
    for model in MODELS_TO_QUERY:
        output_filename = f"{model.replace(':', '-')}_questions.txt"
        print(f"\n--- Processing model: {model} ---")
        
        # 3. Check where to resume from
        last_processed_num = get_last_processed_situation_number(output_filename)
        if last_processed_num > 0:
            print(f"Resuming for '{model}'. Last situation processed was #{last_processed_num}.")
        
        # Open the output file in append mode to add new content
        with open(output_filename, 'a', encoding='utf-8') as f_out:
            # 4. Loop through each situation line
            for situation_line in situations:
                # Extract the number from the situation line (e.g., "1. Some text")
                match = re.match(r'^\s*(\d+)\.(.*)', situation_line)
                if not match:
                    continue # Skip lines that are not correctly numbered
                
                current_num = int(match.group(1))
                situation_text = match.group(2).strip()
                
                # If this situation is already processed, skip it
                if current_num <= last_processed_num:
                    continue
                
                print(f"  [{model}] Querying for situation #{current_num}: '{situation_text[:70]}...'")
                
                generated_questions_raw = get_questions_from_ollama(model, situation_text)
                
                if generated_questions_raw:
                    formatted_q = format_questions(generated_questions_raw)
                    
                    # Write the formatted block to the file
                    f_out.write(f"{situation_line}\n")
                    f_out.write(f"{formatted_q}\n\n")
                else:
                    print(f"  [{model}] FAILED to get questions for situation #{current_num}. Skipping.")
                    f_out.write(f"# FAILED for situation: {situation_line}\n\n")
                
                # A small delay to avoid overwhelming the server
                time.sleep(1)

    print("\nAll models processed. Question generation is complete.")