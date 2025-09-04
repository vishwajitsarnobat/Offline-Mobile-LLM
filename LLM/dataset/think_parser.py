import re

def remove_think_blocks(input_file, output_file):
    """
    Parses a text file to remove everything between <think> and </think> tags.

    Args:
        input_file (str): The path to the input text file.
        output_file (str): The path to the output text file.
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f_in:
            content = f_in.read()

        # Using regex to find and remove the content between the tags.
        # re.DOTALL allows the '.' to match newline characters as well.
        cleaned_content = re.sub(r'<think>.*?</think>\n', '', content, flags=re.DOTALL)

        with open(output_file, 'w', encoding='utf-8') as f_out:
            f_out.write(cleaned_content)

        print(f"Successfully processed {input_file} and saved the output to {output_file}")

    except FileNotFoundError:
        print(f"Error: The file {input_file} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

# --- How to use the script ---

# 1. Save the code above as a Python file (e.g., parse_file.py).
# 2. Create a text file named "input.txt" with the content you provided in the same directory.
# 3. Run the script. It will create a new file named "output.txt" with the desired result.

if __name__ == "__main__":
    input_filename = "deepseek-r1_questions_dataset.txt"
    output_filename = "output_deepseek-r1_questions_dataset.txt"
    remove_think_blocks(input_filename, output_filename)