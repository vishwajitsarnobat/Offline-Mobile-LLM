import ollama
import os
import re
from tqdm import tqdm

INPUT_FILE_NAME = "situations.txt"
MODEL_NAME = "deepseek-r1" # gpt-oss
OUTPUT_FILE_NAME = f"{MODEL_NAME}_questions_dataset.txt"

PROMPT_TEMPLATE = """
You are a data generation assistant for training large language models. Your task is to generate a comprehensive and diverse list of questions that a person might urgently think or ask in a specific survival or emergency situation.

The questions must reflect the perspective of someone directly involved or witnessing the event. Cover a wide spectrum of concerns:
- **Immediate Reactions:** Panicked, instinctual, sensory questions ("What's happening?", "Is everyone okay?!").
- **Situational Awareness:** Information-seeking questions about the environment ("Where is the nearest exit?", "How much time do we have?").
- **Planning & Action:** Problem-solving questions ("What's the first thing I need to do?", "How can I fix this?").
- **Resource Assessment:** Questions about available tools or skills ("What do I have in my bag?", "Does anyone know first aid?").
- **Communication:** Questions directed at others or about getting help ("Can you call 911?", "Is anyone receiving a signal?").
- **Long-term Concerns:** Questions about what happens next ("How will we get rescued?", "What if no one comes?").

**CRITICAL INSTRUCTIONS:**
- Generate a numbered list of **15 to 20 questions**.
- Do NOT add any preamble, commentary, or conclusion. Provide ONLY the raw numbered list of questions.

---
**EXAMPLE**

**Situation:**
A hiker twists their ankle deep in the forest and cannot walk back to the trailhead.

**Generated Questions:**
1. How bad is the break? Can I put any weight on it?
2. Is my phone getting any signal?
3. What do I have in my pack for first aid?
4. How long until it gets dark?
5. Is anyone else on this trail likely to pass by?
6. Should I stay put or try to crawl to a more visible area?
7. Where is the nearest source of fresh water?
8. Can I make some kind of splint from branches?
9. Did I tell anyone my exact route and return time?
10. What animals are in this area and what should I do if one approaches?
11. How cold is it going to get tonight?
12. Is there anything here I can use for shelter?
13. How can I make myself more visible to rescuers?
14. What's the biggest immediate threat: the injury, dehydration, or exposure?
15. Should I try shouting for help periodically?

---
**TASK**

**Situation:**
{situation}

**Generated Questions:**
"""

def get_already_processed_count(filename):
    """Checks the output file to see how many situations have been processed to allow resuming."""
    if not os.path.exists(filename):
        return 0
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        # Find all occurrences of "### SITUATION X ###" and get the highest number
        processed_indices = [int(i) for i in re.findall(r'### SITUATION (\d+) ###', content)]
        return max(processed_indices) if processed_indices else 0
    except Exception:
        return 0

def check_ollama_status():
    """Checks if the Ollama service is running."""
    try:
        ollama.list()
        return True
    except Exception:
        print("\n--- Ollama Connection Error ---")
        print("Could not connect to the Ollama service. Please ensure the Ollama application is running.")
        return False

def generate_questions():
    """Reads situations, skips processed ones, queries the model, and appends results."""
    if not os.path.exists(INPUT_FILE_NAME):
        print(f"\nError: Input file '{INPUT_FILE_NAME}' not found.")
        return

    with open(INPUT_FILE_NAME, 'r', encoding='utf-8') as f:
        situations = [line.strip() for line in f if line.strip()]

    if not situations:
        print(f"Error: No situations found in '{INPUT_FILE_NAME}'.")
        return

    processed_count = get_already_processed_count(OUTPUT_FILE_NAME)
    
    if processed_count >= len(situations):
        print("All situations have already been processed. Nothing to do.")
        return
        
    if processed_count > 0:
        print(f"Resuming generation. Found {processed_count} already processed situations. Skipping...")

    # Open the output file in append mode ('a')
    with open(OUTPUT_FILE_NAME, 'a', encoding='utf-8') as f_out:
        # Create a progress bar starting from the last processed situation
        for i in tqdm(range(processed_count, len(situations)), desc="Generating Questions", initial=processed_count, total=len(situations)):
            situation = situations[i]
            prompt = PROMPT_TEMPLATE.format(situation=situation)
            
            try:
                response = ollama.chat(
                    model=MODEL_NAME,
                    messages=[{'role': 'user', 'content': prompt}]
                )
                generated_questions = response['message']['content'].strip()
                
                f_out.write(f"### SITUATION {i+1} ###\n")
                f_out.write(f"{situation}\n\n")
                f_out.write("### GENERATED QUESTIONS ###\n")
                f_out.write(f"{generated_questions}\n")
                f_out.write("\n" + "="*50 + "\n\n")

            except Exception as e:
                print(f"\nAn error occurred while processing situation {i+1}: {e}")
                f_out.write(f"### SITUATION {i+1} ###\n")
                f_out.write(f"{situation}\n\n")
                f_out.write("### GENERATED QUESTIONS ###\n")
                f_out.write(f"--- ERROR: FAILED TO GENERATE --- (Error: {e})\n")
                f_out.write("\n" + "="*50 + "\n\n")

    print(f"\nDataset generation complete! Results saved in '{OUTPUT_FILE_NAME}'")

if __name__ == "__main__":
    if check_ollama_status():
        generate_questions()