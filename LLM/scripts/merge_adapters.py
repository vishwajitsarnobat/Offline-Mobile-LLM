import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import os

# --- Configuration ---
# 1. The base model ID (the same one we used for training).
base_model_id = "microsoft/Phi-3-mini-4k-instruct"

# 2. The path to your trained LoRA adapters.
#    This should point to the 'final_checkpoint' directory created by the training script.
adapter_path = "./phi3-mini-offline-assistant/final_checkpoint"

# 3. The directory where we will save the merged model.
merged_model_path = "./phi3-mini-offline-assistant/merged_model"

# --- 1. Load the Tokenizer ---
print(f"Loading tokenizer from {base_model_id}...")
tokenizer = AutoTokenizer.from_pretrained(base_model_id)

# --- 2. Load the Base Model ---
print(f"Loading the base model ({base_model_id})...")
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    torch_dtype=torch.bfloat16, # Use the same dtype as training
    device_map="auto",
    trust_remote_code=True,
)

# --- 3. Load the PEFT Model (Base Model + Adapters) ---
print(f"Loading PEFT model and applying adapters from {adapter_path}...")
# This loads the base model and attaches the adapters to it
model = PeftModel.from_pretrained(base_model, adapter_path)

# --- 4. Merge the Adapters into the Model ---
print("Merging the LoRA adapters into the base model...")
# This operation creates a new, standard model by combining the weights
model = model.merge_and_unload()
print("Merging complete.")

# --- 5. Save the Merged Model and Tokenizer ---
print(f"Saving the merged model to {merged_model_path}...")
os.makedirs(merged_model_path, exist_ok=True)
model.save_pretrained(merged_model_path)
tokenizer.save_pretrained(merged_model_path)

print("\n--- Merging Process Finished ---")
print(f"Your fully fine-tuned model has been saved to: {merged_model_path}")
print("Next step is to convert this model to GGUF format.")