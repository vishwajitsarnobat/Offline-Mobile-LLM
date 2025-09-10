import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig
from trl import SFTTrainer
import os

# --- Configuration ---
# 1. The small, efficient model we will train (our "student").
student_model_id = "microsoft/Phi-3-mini-4k-instruct"

# 2. The instruction dataset we created in the previous step.
dataset_file = "teacher_generated.jsonl"

# 3. The name for the output directory where our trained model adapters will be saved.
output_dir = "./phi3-mini-offline-assistant"

# --- 1. Load the Dataset ---
print(f"Loading dataset from {dataset_file}...")
dataset = load_dataset("json", data_files=dataset_file, split="train")
print("Dataset loaded successfully.")

# --- 2. Configure Quantization (for memory efficiency) ---
# This configuration tells the model to load in 4-bit precision.
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=False,
)

# --- 3. Load the Student Model and Tokenizer ---
print(f"Loading base model: {student_model_id}")
model = AutoModelForCausalLM.from_pretrained(
    student_model_id,
    quantization_config=bnb_config,
    device_map="auto", # Automatically use GPU if available
    trust_remote_code=True,
)
model.config.use_cache = False
model.config.pretraining_tp = 1

tokenizer = AutoTokenizer.from_pretrained(student_model_id, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"
print("Base model and tokenizer loaded.")

# --- 4. Configure LoRA (the efficient training method) ---
peft_config = LoraConfig(
    lora_alpha=16,
    lora_dropout=0.1,
    r=64,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["qkv_proj", "o_proj", "gate_up_proj", "down_proj"]
)

# --- 5. Define a Formatting Function ---
# This function will structure our data into the chat format that Phi-3 expects.
# It combines the original situation (context) with the user's question (instruction).
def format_training_example(example):
    # The 'example' here is a single row from your dataset.
    # We need to access its columns, which might be nested inside another key.
    # Let's check the structure of the dataset first.
    if 'instruction' in example and 'response' in example and 'context' in example:
        context_text = f"Original Situation: {example['context']}"
        instruction_text = example['instruction']
        response_text = example['response']
        
        # Combine context and instruction for the user's turn
        full_instruction = f"{context_text}\n\nQuestion: {instruction_text}"
        
        # Format as a list of messages
        return [
            {"role": "user", "content": full_instruction},
            {"role": "assistant", "content": response_text},
        ]
    # This is a fallback for datasets that might be loaded differently
    return [{"role": "user", "content": ""}, {"role": "assistant", "content": ""}]

# --- 6. Configure Training Arguments ---
training_arguments = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=1,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    optim="paged_adamw_32bit",
    save_steps=100,
    logging_steps=10,
    learning_rate=2e-4,
    weight_decay=0.001,
    fp16=False,
    bf16=True,
    max_grad_norm=0.3,
    max_steps=-1,
    warmup_ratio=0.03,
    group_by_length=True,
    lr_scheduler_type="constant",
)

# --- 7. Create the Trainer ---
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=peft_config,
    max_seq_length=2048, # Increased to accommodate context + question + answer
    tokenizer=tokenizer,
    args=training_arguments,
    formatting_func=format_training_example, # Use our custom formatting function
)

# --- 8. Start Training ---
print("\n--- Starting Model Fine-Tuning ---")
trainer.train()
print("--- Fine-Tuning Complete ---")

# --- 9. Save the Final Model Adapters ---
final_model_path = os.path.join(output_dir, "final_checkpoint")
trainer.save_model(final_model_path)
print(f"\nFine-tuned model adapters saved to: {final_model_path}")
print("Next step: Merge these adapters and convert to GGUF format for mobile.")