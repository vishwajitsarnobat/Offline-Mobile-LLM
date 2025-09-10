import re
import os

# --- Configuration ---
INPUT_FILENAME = "deepseek-r1_questions.txt"
OUTPUT_FILENAME = "deepseek-r1_questions_new.txt"

def clean_and_process_file():
    """
    Reads the input file and performs a multi-stage cleaning process
    based on the specified rules.
    """
    print(f"Reading input file: {INPUT_FILENAME}")
    try:
        with open(INPUT_FILENAME, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: The file '{INPUT_FILENAME}' was not found.")
        return

    # --- Global Cleaning Stage ---

    # Expected Outcome 0: Replace ** with ""
    content = content.replace('**', '')

    # Expected Outcome 2: Remove all text between and including <think> tags.
    # The re.DOTALL flag is crucial because the think block spans multiple lines.
    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)

    # --- Block Processing Stage ---

    # Split the content into blocks. A new block starts after a blank line,
    # followed by a numbered line (which we identify as a situation).
    blocks = re.split(r'\n\s*\n(?=\d+\.)', content)
    
    final_cleaned_blocks = []

    # Process each block to clean up questions
    for block in blocks:
        if not block.strip():
            continue

        lines = block.strip().split('\n')
        situation_line = lines[0]
        potential_question_lines = lines[1:]

        # A list to store only the valid question text for this block
        valid_questions = []
        
        # Phrases that identify a line as junk to be removed
        filler_phrases_to_remove = (
            "okay,", "here are", "here is", "here's", "these questions"
        )

        for line in potential_question_lines:
            # Expected Outcome 1: Remove the old local/global numbering.
            text_only = re.sub(r'^\s*\d+\.\s*', '', line.strip())

            # Skip any blank lines that might result from the cleaning
            if not text_only:
                continue

            # Expected Outcome 3: Remove lines with specific starting phrases.
            if text_only.lower().startswith(filler_phrases_to_remove):
                continue

            # If the line survives all checks, it's a valid question.
            valid_questions.append(text_only)
        
        # --- Final Assembly Stage for the Block ---

        # Start building the final output for this block with the situation line
        current_block_output = [situation_line]
        
        # Expected Outcome 3 (Renumber): Renumber the cleaned questions from 1 to n.
        for i, question_text in enumerate(valid_questions):
            current_block_output.append(f"{i + 1}. {question_text}")
        
        # Add the fully processed block to our list of final blocks
        final_cleaned_blocks.append("\n".join(current_block_output))

    # Join all the cleaned blocks with double newlines for proper separation
    final_output = "\n\n".join(final_cleaned_blocks)

    # Write the result to the output file
    with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
        f.write(final_output)

    print(f"\nProcessing complete.")
    print(f"Cleaned file saved as: {OUTPUT_FILENAME}")

if __name__ == "__main__":
    clean_and_process_file()