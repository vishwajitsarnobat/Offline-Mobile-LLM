Here’s your enhanced README in **Markdown** format:

```markdown
# Converting HF Models to GGUF and Quantization with llama.cpp

## Common Issues

**Problem:**  
When converting Hugging Face models to GGUF format, you may encounter an error:

```

tokenizer.model not found

```

**Reason:**  
Recent Hugging Face models only ship with `tokenizer.json` instead of `tokenizer.model`.

**Solution:**  
Manually copy `tokenizer.model` from the original model release on Hugging Face (of the same model size).  
Place it in the model directory before running the conversion script.

---

## Quantization with llama.cpp

### 1. Build llama.cpp executables

```bash
mkdir build
cd build
cmake ..
make
cd ..
```

---

### 2. Quantize the Model

```bash
./build/bin/llama-quantize phi3.gguf phi3-quantized.gguf Q4_K_M
```

* `phi3.gguf`: Input model in GGUF format.
* `phi3-quantized.gguf`: Output quantized model.
* `Q4_K_M`: Recommended quantization type for a good balance between performance and accuracy.

---

### 3. Run the Model

```bash
./build/bin/llama-cli -m phi3-quantized.gguf
```

---
