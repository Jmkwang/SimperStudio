# Pending Tasks for SimperStudio

1.  **Frontend Functionality:**
    *   [x] Verify the new dropdown in `WorkflowCanvas` actually spawns the correct new generic node visually.
    *   [x] Connect the Custom API settings fields in `SettingsView` to actually override the endpoint in the chat session API calls (ensure the app uses `customBaseUrl` and `customModelId` when the provider is set to 'custom').

2.  **Agents View Enhancements:**
    *   [x] Implement a grid or list view of *all* agents when no specific agent is selected in the sidebar, rather than just showing a "Select an agent" message. This makes the UI more discoverable.
    *   [x] Filter agents by industry visually if we group them that way (e.g., tabs for 'Technology', 'Finance', etc.).

3.  **Chat Session Integration:**
    *   [x] Ensure the `ChatSession` view properly routes the selected agent into the workflow/conversation.
    *   [x] Implement the actual streaming logic to connect the UI to the backend Tauri commands for generating AI responses (if not fully completed yet).

4.  **Backend (Rust / Tauri):**
    *   [ ] Ensure `get_agents` and `add_agent` Tauri commands are fully operational and persisting data between app restarts.
