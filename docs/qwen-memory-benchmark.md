# Measured CPU memory: Qwen 0.5B

Measured on 18 November 2026 in a Linux x86_64 cloud environment. This is actual CPU inference, not a prediction from download size.

| Setting | Value |
| --- | --- |
| Model | Official Qwen2.5-0.5B-Instruct Q4_K_M GGUF |
| Model file | 491,400,032 bytes |
| Runtime | Official llama.cpp b12498, commit `52975342f` |
| CPU threads | 2 used; 9 visible |
| GPU | None; `--device none -ngl 0` |
| Context | 1,024 tokens |
| Batch / microbatch | 64 / 64 |
| Maximum output | 160 tokens |
| Temperature | 0 |
| Limits | 2 GiB virtual-address limit; 120-second CPU and wall limits |

| Prompt | Peak RSS | Wall time | Generation speed | Result |
| --- | --- | --- | --- | --- |
| Brief category instructions | 574.80 MiB / 602.72 MB | 3.568 s | 28.05 tokens/s | Incorrect categories |
| Explicit definitions plus one example | 572.90 MiB / 600.73 MB | 3.005 s | 30.81 tokens/s | Correct stated facts; combined two actions in one string |

Peak RSS was measured using Linux `resource.getrusage(RUSAGE_CHILDREN).ru_maxrss`. The model/page cache may already have been warm. Runtime allocation logs included a 12 MiB KV cache, 38.31 MiB compute buffer, 0.58 MiB output buffer and 28.05 MiB CPU repack buffer. Those are components, not amounts to add to measured RSS.

Only one ordinary note was tested. The tiny model's instruction-following was prompt-sensitive. These results establish that the cloud CPU can run this model; they do not establish broad note-organizing reliability.

## Reproduce

```text
llama-completion -m qwen2.5-0.5b-instruct-q4_k_m.gguf --device none -ngl 0 -t 2 -c 1024 -b 64 -ub 64 -n 160 --temp 0 --seed 1 --no-conversation --no-display-prompt --verbose -f prompt.txt
```

The Windows learning script uses this small configuration and the successful example prompt. Native Windows binary overhead can differ. WSL adds a separate VM's memory overhead. The cloud CPU's speed does not predict the older i5 laptop's speed.

With approximately 1.1 GiB currently available on an 8 GB laptop, a roughly 0.56 GiB process would leave about 0.54 GiB before accounting for differences and changing workloads. That is a plausible experiment, but narrow headroom; save work and free unused applications first.

The Chrome Gemini Nano eligibility requirement is separate and remains unchanged by this result.

## Upstream sources and integrity

- [Official model](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF)
- [Exact model download](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf)
- Model SHA-256: `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`
- [llama.cpp b12498](https://github.com/ggml-org/llama.cpp/releases/tag/b12498)
- [Windows CPU package](https://github.com/ggml-org/llama.cpp/releases/download/b12498/llama-b12498-bin-win-cpu-x64.zip)
- Windows package SHA-256: `eeb67345805510a1a955430d559336a3c535345d9a19467bf89fa0a6a34d4173`
