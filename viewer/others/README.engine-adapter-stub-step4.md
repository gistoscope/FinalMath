Step 4: EngineAdapter + StubEngine are wired to FileBus in the browser demo.
- EngineAdapter subscribes to ClientEvent BusMessage
- For each event, it publishes EngineRequest and EngineResponse BusMessages
- StubEngine echoes latex and highlights the selected surfaceNodeId (if any)
You can inspect filebus-messages.jsonl to see ClientEvent / EngineRequest / EngineResponse triplets.
