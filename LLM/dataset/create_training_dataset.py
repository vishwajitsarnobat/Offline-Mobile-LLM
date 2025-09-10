import requests
import json
import os
import re
import time
import random
from tqdm import tqdm # Import tqdm

# --- Configuration ---
# 1. IMPORTANT: Update this list with the names of all your generated question files.
QUESTION_FILES = [
    "/home/dell-pc-03/Offline-Mobile-LLM/LLM/dataset/gpt-oss_questions.txt",
    # "llama3.1_questions_cleaned.txt", # Use the cleaned versions of your files
    # "deepseek-r1_questions_cleaned.txt"
    # "mixtral_questions_cleaned.txt"
]

# 2. Set the number of questions to randomly select from each situation.
#    Set to 0 to use ALL available unique questions for each situation.
QUESTIONS_PER_SITUATION = 5 # Example: Use 5 questions per situation

# 3. A random seed to ensure the question selection is the same every time you run.
#    This is crucial for the resume functionality to work correctly.
RANDOM_SEED = 42

# 4. The local model that will act as the "teacher" to provide the answers.
TEACHER_MODEL = "gpt-oss"

# 5. The final output file, ready for training.
OUTPUT_JSONL_FILE = "/home/dell-pc-03/Offline-Mobile-LLM/LLM/scripts/teacher_dataset.jsonl"

OLLAMA_API_URL = "http://localhost:11434/api/generate"

# 6. The system prompt to guide the teacher model to give high-quality answers.
TEACHER_SYSTEM_PROMPT = """
You are an expert AI assistant. Your purpose is to provide clear, safe, factual, and actionable guidance for offline situations. Based on the context of the situation provided, give a direct, helpful, and comprehensive answer to the user's question. Prioritize safety and practical, step-by-step instructions. If the situation is inherently dangerous, you must include a warning to seek professional help if available, but you must still provide the best possible immediate guidance for a person who has no other options.
"""

def parse_question_files(filenames, num_questions, seed):
    """
    Reads all question files, consolidates them, and randomly samples a
    fixed number of questions for each situation.
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
            
    # --- Logic for sampling questions ---
    random.seed(seed) # Set the seed for reproducibility
    sampled_data = {}
    for situation, questions_set in consolidated_data.items():
        questions_list = list(questions_set)
        random.shuffle(questions_list) # Shuffle for a random sample
        
        if num_questions > 0:
            # Take the first N questions after shuffling
            sampled_data[situation] = questions_list[:num_questions]
        else:
            # If 0, take all questions
            sampled_data[situation] = questions_list
            
    return sampled_data

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
        # The print statement will correctly appear above the tqdm bar.
        print(f"\nError querying teacher model '{model_name}': {e}")
        return None

# --- Main Script Logic ---
if __name__ == "__main__":
    # 1. Parse and consolidate all questions, applying the sampling logic
    print("--- Phase 1: Consolidating, Deduplicating, and Sampling Questions ---")
    all_data = parse_question_files(QUESTION_FILES, QUESTIONS_PER_SITUATION, RANDOM_SEED)
    total_questions = sum(len(qs) for qs in all_data.values())
    print(f"Consolidation complete. Found {len(all_data)} unique situations and selected {total_questions} total questions to process.\n")
    
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
        if processed_questions:
            print(f"Found {len(processed_questions)} questions already answered in the output file. Resuming process.\n")
        
    # 3. Create the final list of questions that still need answers
    questions_to_process = []
    for situation, questions in all_data.items():
        for question in questions:
            if question not in processed_questions:
                questions_to_process.append((situation, question))

    if not questions_to_process:
        print("All selected questions have already been answered. Dataset is complete.")
        exit()
        
    print(f"--- Phase 2: Generating Answers for {len(questions_to_process)} Remaining Questions ---")
    
    # Open the output file and start the main loop with a tqdm progress bar
    with open(OUTPUT_JSONL_FILE, 'a', encoding='utf-8') as f_out:
        for situation, question in tqdm(questions_to_process, desc="Generating Answers"):
            
            # Safety check for short questions (less than 5 words)
            if len(question.split()) < 5:
                # We can skip this question; the progress bar will just continue.
                continue
            
            answer = generate_answer(TEACHER_MODEL, situation, question)
            
            if answer:
                json_record = {
                    "instruction": question,
                    "response": answer,
                    "context": situation
                }
                f_out.write(json.dumps(json_record) + "\n")
            else:
                # This message will print above the progress bar if an error occurs
                print(f"  -> FAILED to get an answer for question: '{question}'. Will retry on next run.")

            time.sleep(1) # Small delay to be nice to the Ollama server

    print("\n--- Dataset Creation Complete ---")
    print(f"Your final, training-ready dataset is saved to: {OUTPUT_JSONL_FILE}")