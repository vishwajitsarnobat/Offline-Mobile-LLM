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
# 1. The base model we will train (our "student"). Phi-3-mini is an excellent choice.
student_model_id = "microsoft/Phi-3-mini-4k-instruct"

# 2. The instruction dataset we created in the previous step.
dataset_file = "teacher_generated.jsonl"

# 3. The name for the output directory where our trained model adapters will be saved.
output_dir = "./offline-assistant-phi3-mini"

# --- 1. Load the Dataset ---
print(f"Loading dataset from {dataset_file}")
# The 'context' column will be ignored by the trainer, which is fine.
dataset = load_dataset("json", data_files=dataset_file, split="train")

# --- 2. Configure Quantization (for memory efficiency) ---
# Load the model in 4-bit precision to save memory.
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
# The padding token is required for training. We use the end-of-sequence token.
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# --- 4. Configure LoRA (the efficient training method) ---
# LoRA adds small "adapter" layers to the model, which are the only parts we train.
peft_config = LoraConfig(
    lora_alpha=16,
    lora_dropout=0.1,
    r=64,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["qkv_proj", "o_proj", "gate_up_proj", "down_proj"] # Modules specific to Phi-3
)

# --- 5. Configure Training Arguments ---
training_arguments = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=1,             # One full pass over the data is usually enough.
    per_device_train_batch_size=2,  # Lower to 1 if you run out of GPU memory.
    gradient_accumulation_steps=4,  # Effective batch size = 2 * 4 = 8.
    optim="paged_adamw_32bit",
    save_steps=100,
    logging_steps=10,
    learning_rate=2e-4,
    weight_decay=0.001,
    fp16=False,
    bf16=True,                      # Use bfloat16 for speed.
    max_grad_norm=0.3,
    max_steps=-1,                   # Set to a small number (e.g., 50) to test the script.
    warmup_ratio=0.03,
    group_by_length=True,
    lr_scheduler_type="constant",
)

# --- 6. Create the Trainer ---
# SFTTrainer simplifies the process of instruction fine-tuning.
# It automatically formats the data into the chat template the model expects.
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=peft_config,
    dataset_text_field="instruction", # We specify a field just to satisfy the API
    max_seq_length=2048,              # Max length of prompts + answers.
    tokenizer=tokenizer,
    args=training_arguments,
    # This function is the key to formatting our data correctly for the model.
    formatting_func=lambda example: [
        {"role": "user", "content": example["instruction"][0]},
        {"role": "assistant", "content": example["response"][0]}
    ],
)

# --- 7. Start Training ---
print("Starting fine-tuning...")
trainer.train()
print("Fine-tuning complete.")

# --- 8. Save the Final Model Adapters ---
# This saves only the small, trained LoRA adapters, not the entire model.
final_model_path = os.path.join(output_dir, "final_checkpoint")
trainer.save_model(final_model_path)
print(f"Fine-tuned model adapters saved to: {final_model_path}")