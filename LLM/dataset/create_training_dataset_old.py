import requests
import json
import os
import re
import time

# --- Configuration ---
# 1. IMPORTANT: Update this list with the names of all your generated question files.
QUESTION_FILES = [
    "gpt-oss_questions.txt",
    "llama3.1_questions.txt",
    "deepseek-r1_questions.txt"
    # "mixtral_questions.txt"
]

# 2. The local model that will act as the "teacher" to provide the answers.
TEACHER_MODEL = "gpt-oss"

# 3. The final output file, ready for training.
OUTPUT_JSONL_FILE = "../scripts/teacher_generated.jsonl"

OLLAMA_API_URL = "http://localhost:11434/api/generate"

# 4. The system prompt to guide the teacher model to give high-quality answers.
TEACHER_SYSTEM_PROMPT = """
You are an expert AI assistant. Your purpose is to provide clear, safe, factual, and actionable guidance for offline situations. Based on the context of the situation provided, give a direct, helpful, and comprehensive answer to the user's question. Prioritize safety and practical, step-by-step instructions. If the situation is inherently dangerous, you must include a warning to seek professional help if available, but you must still provide the best possible immediate guidance for a person who has no other options.
"""

def parse_question_files(filenames):
    """
    Reads all question files and consolidates them into a single dictionary.
    This version is corrected to properly handle the file structure.
    """
    consolidated_data = {}
    
    for filename in filenames:
        if not os.path.exists(filename):
            print(f"Warning: File not found, skipping: {filename}")
            continue
        
        print(f"Parsing file: {filename}")
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        blocks = re.split(r'\n\s*\n', content)
        
        for block in blocks:
            if not block.strip():
                continue
            
            lines = block.strip().split('\n')
            situation = lines[0].strip()
            questions_text = "\n".join(lines[1:])
            
            questions = [q.strip() for q in re.findall(r'\d+\.\s*(.*)', questions_text)]
            
            if situation not in consolidated_data:
                consolidated_data[situation] = set()
            
            consolidated_data[situation].update(questions)
            
    # Convert sets back to lists for processing
    return {sit: list(qs) for sit, qs in consolidated_data.items()}

def generate_answer(model_name, context, question):
    """Queries the teacher model for an answer."""
    prompt = f"Context of the situation:\n{context}\n\nUser's question:\n{question}"
    
    payload = {
        "model": model_name,
        "prompt": prompt,
        "system": TEACHER_SYSTEM_PROMPT,
        "stream": False,
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except requests.exceptions.RequestException as e:
        print(f"\nError querying teacher model '{model_name}': {e}")
        return None

# --- Main Script Logic ---
if __name__ == "__main__":
    # 1. Parse and consolidate all questions
    print("--- Phase 1: Consolidating and Deduplicating Questions ---")
    all_data = parse_question_files(QUESTION_FILES)
    total_questions = sum(len(qs) for qs in all_data.values())
    print(f"Consolidation complete. Found {len(all_data)} unique situations and {total_questions} unique questions.\n")
    
    # 2. Load already answered questions to allow for resuming
    processed_questions = set()
    if os.path.exists(OUTPUT_JSONL_FILE):
        with open(OUTPUT_JSONL_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    data = json.loads(line)
                    processed_questions.add(data['instruction'])
                except json.JSONDecodeError:
                    continue
        print(f"Found {len(processed_questions)} questions already answered. Resuming process.\n")
        
    # 3. Generate answers for unprocessed questions
    print(f"--- Phase 2: Generating Answers with Teacher Model ({TEACHER_MODEL}) ---")
    
    questions_to_process = []
    for situation, questions in all_data.items():
        for question in questions:
            if question not in processed_questions:
                questions_to_process.append((situation, question))

    processed_count = 0
    with open(OUTPUT_JSONL_FILE, 'a', encoding='utf-8') as f_out:
        for situation, question in questions_to_process:
            
            # Safety check for short questions (less than 5 words)
            if len(question.split()) < 5:
                print(f"  -> SKIPPING short question (fewer than 5 words): '{question}'")
                continue
            
            processed_count += 1
            print(f"Generating answer {processed_count}/{len(questions_to_process)} | Situation: '{situation[:50]}...'")
            
            answer = generate_answer(TEACHER_MODEL, situation, question)
            
            if answer:
                json_record = {
                    "instruction": question,
                    "response": answer,
                    "context": situation
                }
                f_out.write(json.dumps(json_record) + "\n")
            else:
                print(f"  -> FAILED to get an answer for question: '{question}'. Will retry on next run.")

            time.sleep(1)

    print("\n--- Dataset Creation Complete ---")
    print(f"Your final, training-ready dataset is saved to: {OUTPUT_JSONL_FILE}")