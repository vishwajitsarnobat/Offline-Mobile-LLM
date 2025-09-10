import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import os

# --- Configuration ---
# 1. The base model ID (the same one we used for training).
base_model_id = "microsoft/Phi-3-mini-4k-instruct"

# 2. The path to your trained LoRA adapters.
adapter_path = "/home/dell-pc-03/Offline-Mobile-LLM/LLM/scripts/offline-assistant-phi3-mini/final_checkpoint"

# 3. The directory where the final, merged model will be saved.
merged_model_path = "/home/dell-pc-03/Offline-Mobile-LLM/LLM/scripts/phi3-mini-offline-assistant-merged"

# --- Main Script Logic ---
print(f"Loading base model: {base_model_id}")
# Load the base model with float16 precision for merging.
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True,
)

print(f"Loading LoRA adapters from: {adapter_path}")
# Load the PeftModel by combining the base model with the adapters
model = PeftModel.from_pretrained(base_model, adapter_path)

print("Merging the model and adapters...")
# Merge the LoRA layers into the base model
model = model.merge_and_unload()
print("Merge complete.")

# Load the tokenizer associated with the base model
tokenizer = AutoTokenizer.from_pretrained(base_model_id, trust_remote_code=True)

print(f"Saving the merged model to: {merged_model_path}")
# Save the merged model and tokenizer
model.save_pretrained(merged_model_path)
tokenizer.save_pretrained(merged_model_path)

print("\nProcess complete!")
print("Your merged model is ready for quantization.")