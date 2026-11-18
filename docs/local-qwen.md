# Optional native Windows CPU exercise

This exercise runs Qwen locally using llama.cpp. It is separate from Firebase and Chrome's built-in model.

1. Save open work. A Windows restart is useful after a long-running session but is not required for every request.
2. Open Task Manager → Performance → Memory. The script uses a conservative starting check of at least 1,024 MiB available RAM. That is a working guard for this exercise, not Chrome's hardware requirement.
3. Open PowerShell in this repository and run:

```powershell
.\scripts\run-local-qwen.ps1
```

The first run downloads approximately 25.5 MB of Windows CPU binaries and 491.4 MB of model weights from their official upstream hosts, verifies SHA-256 checksums, and stores them in the Git-ignored `.local-qwen` folder. Use an appropriate connection for this initial download.

4. Confirm an answer appears. Record Windows memory use and the elapsed time.
5. Disconnect Wi-Fi and rerun the same command. Existing verified files are reused. A new generated response while disconnected demonstrates local inference.
6. Reconnect and inspect the answer for incorrect or invented details.

The provided note and prompt are in the script. Pass a different short note with `-Note` to test another example:

```powershell
.\scripts\run-local-qwen.ps1 -Note "Chairs arrived. Handouts are missing. Rina must print them."
```

The script enforces a short context, two CPU threads and a 160-token output cap. A native binary avoids WSL overhead. Actual Windows peak RAM and speed are unverified. If the binary reports a missing dependency or unsupported instruction, preserve the error for diagnosis instead of repeatedly running it.

The very small model made category errors with a weaker prompt during the Linux test. One successful output is not evidence of broad reliability. Use the cloud model for the main application demonstration once Firebase is connected.
