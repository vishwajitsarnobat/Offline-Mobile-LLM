import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig
import os

# --- Configuration ---
# 1. The base model we will train (our "student"). Phi-3-mini is an excellent choice.
student_model_id = "microsoft/Phi-3-mini-4k-instruct"

# 2. The instruction dataset we created in the previous step.
dataset_file = "/home/dell-pc-03/Offline-Mobile-LLM/LLM/scripts/teacher_generated.jsonl"

# 3. The name for the output directory where our trained model adapters will be saved.
output_dir = "/home/dell-pc-03/Offline-Mobile-LLM/LLM/scripts/offline-assistant-phi3-mini"

# --- 1. Load the Dataset ---
print(f"Loading dataset from {dataset_file}")
dataset = load_dataset("json", data_files=dataset_file, split="train")

# --- 2. Configure Quantization (for memory efficiency) ---
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=False,
)

# --- 3. Load the tokenizer separately (needed for dataset preprocessing) ---
print(f"Loading tokenizer: {student_model_id}")
tokenizer = AutoTokenizer.from_pretrained(student_model_id, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# --- 4. Configure LoRA (the efficient training method) ---
peft_config = LoraConfig(
    lora_alpha=16,
    lora_dropout=0.1,
    r=64,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["qkv_proj", "o_proj", "gate_up_proj", "down_proj"]
)

# --- 5. Convert dataset to conversational format ---
def convert_to_conversational(example):
    """Convert instruction-response pairs to conversational format"""
    return {
        "messages": [
            {"role": "user", "content": example["instruction"]},
            {"role": "assistant", "content": example["response"]}
        ]
    }

# Apply conversion to dataset
formatted_dataset = dataset.map(convert_to_conversational, remove_columns=dataset.column_names)

# --- 6. Configure SFTConfig (replaces TrainingArguments) ---
training_args = SFTConfig(
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
    lr_scheduler_type="cosine",
    # SFT-specific parameters
    max_length=2048,
    packing=False,
    # Model initialization parameters
    model_init_kwargs={
        "quantization_config": bnb_config,
        "device_map": "auto",
        "trust_remote_code": True,
        "use_cache": False,
    }
)

# --- 7. Create the Trainer ---
trainer = SFTTrainer(
    model=student_model_id,  # Pass model as string, not object
    args=training_args,
    train_dataset=formatted_dataset,
    peft_config=peft_config,
    processing_class=tokenizer,  # Use processing_class instead of tokenizer
)

# --- 8. Start Training ---
print("Starting fine-tuning...")
trainer.train()
print("Fine-tuning complete.")

# --- 9. Save the Final Model Adapters ---
final_model_path = os.path.join(output_dir, "final_checkpoint")
trainer.save_model(final_model_path)
print(f"Fine-tuned model adapters saved to: {final_model_path}")

# Save the tokenizer as well
trainer.processing_class.save_pretrained(final_model_path)