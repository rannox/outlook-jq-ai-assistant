# JQuad AI Assistant - Outlook Add-in

A modern Outlook add-in developed by [JQuad](https://www.jquad.rocks/) that provides an intelligent, conversational AI assistant for email management. Built with ambient agent patterns and human-in-the-loop capabilities.

## ✨ Features

### 🗣️ **Conversational Interface**
- **Natural Chat Experience**: Type requests in plain English like "Write a proposal to decline this meeting"
- **Streaming Responses**: Real-time, word-by-word AI responses
- **Smart Suggestions**: Quick action buttons for common tasks
- **Context Awareness**: AI understands email content and conversation history

### 🔧 **Smart Email Actions**
- **Email Composition**: Generate professional replies, declinations, proposals
- **Content Analysis**: Summarize emails, extract tasks, analyze sentiment  
- **Outlook Integration**: Seamlessly opens AI-generated emails in Outlook for editing
- **Multiple Formats**: Handles various email types and languages

### 🤝 **Human-in-the-Loop Workflow**
- **Smart Approval System**: Context-aware buttons that appear when AI needs feedback
- **Inline Chat Approvals**: Beautiful, chat-integrated approval buttons
- **Revision Support**: Request changes and get improved email proposals
- **Outlook Integration**: Seamless handoff to Outlook for final editing

## Architecture

This is the **client-side** component of a separated architecture:

- **Outlook Add-in** (this project): Lightweight UI client using TypeScript/Office.js
- **Agent Service** (separate project): Python FastAPI + LangGraph backend

## Prerequisites

1. **Agent Service**: Ensure the agent service is running on `http://localhost:8000`
2. **Node.js**: Version 16 or higher
3. **Outlook**: Desktop or web version

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start development server:
```bash
npm run dev-server
```

4. Load the add-in in Outlook:
```bash
npm run start
```

## Development

### Available Scripts

- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run dev-server` - Start development server with hot reload
- `npm run start` - Start Outlook debugging
- `npm run stop` - Stop Outlook debugging
- `npm run validate` - Validate manifest.xml

### Project Structure

```
src/
├── models/
│   └── types.ts           # TypeScript interfaces
├── taskpane/
│   ├── taskpane.html      # Main UI template
│   ├── taskpane.css       # Styles
│   ├── taskpane.ts        # Main application logic
│   ├── api-client.ts      # Agent service API client
│   ├── websocket-client.ts # Real-time communication
│   └── ui-components.ts   # UI helper functions
└── utils/
    └── office-helpers.ts  # Office.js utilities
```

## Configuration

The add-in connects to the agent service at `http://localhost:8000` by default. To change this:

1. Update the base URL in `src/taskpane/api-client.ts`
2. Update the WebSocket URL in `src/taskpane/websocket-client.ts`
3. Add any new domains to `manifest.xml` `<AppDomains>` section

## 🚀 Usage Examples

### **Basic Chat Interaction**
1. **Open the Add-in**: Click "AI Assistant" in Outlook ribbon
2. **Start Chatting**: Type natural requests like:
   - *"Summarize this email"*
   - *"Extract the key tasks"*
   - *"What's the sentiment here?"*
3. **Get Instant Responses**: AI responds in real-time with relevant information

### **Email Composition Workflow**
```
👤 You: "Write a professional reply declining this meeting invitation"

🤖 AI: [Shows generated email with proper structure]
     "Would you like me to open this email in Outlook for you to review and send?"

🎯 Actions: [📧 Open in Outlook] [✏️ Revise] [❌ Reject]
```

**If you click "📧 Open in Outlook":**
- Outlook reply window opens with the AI-generated email
- You can edit, review, and send directly from Outlook
- No copy-paste needed!

**If you click "✏️ Revise":**
```
👤 You: "Make it more formal and add an apology"

🤖 AI: [Shows revised version with your requested changes]
     "Would you like me to open this revised email in Outlook?"
```



### **Quick Action Buttons**
Use the suggestion buttons for instant actions:
- **✅ Extract Tasks** → Get bullet-pointed action items
- **📝 Write Reply** → Generate professional email responses  
- **📄 Summarize** → Get concise email summaries
- **😊 Sentiment** → Analyze email tone and sentiment

## 🎯 Human-in-the-Loop Workflow

Our approval system uses **inline chat buttons** that adapt to context:

### **For Email Proposals:**
- **📧 Open in Outlook** (Primary) - Opens email in Outlook for editing
- **✏️ Revise** - Request specific changes to the email
- **❌ Reject** - Decline the proposal



### **Smart Features:**
- **Context-Aware**: Buttons change based on content type
- **Visual Hierarchy**: Primary actions are highlighted
- **Conversational**: All interactions feel natural in chat
- **Error Handling**: Graceful fallbacks for all operations

## Troubleshooting

### Connection Issues
- Ensure the agent service is running on `http://localhost:8000`
- Check the connection status indicator in the add-in header
- Use the "Test Connection" button to verify connectivity

### Office.js Issues
- Refresh the Outlook add-in pane
- Clear browser cache if using Outlook on the web
- Restart Outlook desktop application

### Build Issues
- Delete `node_modules` and `package-lock.json`, then run `npm install`
- Ensure TypeScript version compatibility
- Check for port conflicts on port 3000

## 💡 Advanced Features

### **Ambient Agent Pattern**
This add-in implements the ambient agent pattern inspired by [LangChain Academy](https://academy.langchain.com/courses/ambient-agents):
- **Always-on Context**: AI maintains awareness of email content throughout the conversation
- **Memory Persistence**: Conversation history is maintained across interactions
- **Intent Detection**: AI automatically understands what you want to accomplish
- **Streaming Responses**: Real-time feedback for improved user experience

### **LangGraph Integration**
Compatible with [LangGraph Agent Inbox](https://github.com/langchain-ai/agent-inbox) standards:
- **Interrupt Schema**: Follows standard `HumanInterrupt` and `HumanResponse` patterns
- **Action Types**: Supports `accept`, `edit`, `ignore` actions optimized for email workflows
- **Config-driven**: Approval buttons adapt based on agent configuration
- **WebSocket Communication**: Real-time updates via WebSocket connections

## 🛠️ Development Tips

1. **Hot Reload**: The dev server supports hot reload for faster development
2. **Debugging**: Use browser dev tools when running in Outlook on the web
3. **Manifest Changes**: Restart Outlook after modifying `manifest.xml`
4. **HTTPS Required**: Outlook requires HTTPS for add-ins (dev server provides this)
5. **Chat Interface**: All user interactions now flow through the conversational interface
6. **Approval Testing**: Use proposal-type requests to test the approval workflow

## License

MIT License - see LICENSE file for details

## Related Projects

- **Agent Service**: The Python FastAPI + LangGraph backend that powers this add-in