import re

def renumber_file(input_file, output_file, start_num=1):
    with open(input_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    counter = start_num

    for line in lines:
        stripped = line.strip()
        if stripped:  # only process non-empty lines
            # Remove any leading numbers with dots (handles cases like "1704. 1804.")
            cleaned = re.sub(r'^\d+(\.\s*)+', '', stripped)
            new_line = f"{counter}. {cleaned}\n"
            new_lines.append(new_line)
            counter += 1
        else:
            new_lines.append("\n")  # keep blank lines

    with open(output_file, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


# Example usage:
renumber_file("situations.txt", "output.txt", start_num=1)
