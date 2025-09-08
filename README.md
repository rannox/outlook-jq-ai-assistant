# JQuad AI Assistant - Outlook Add-in

A modern Outlook add-in developed by [JQuad](https://www.jquad.rocks/) that provides an intelligent, conversational AI assistant for email management. Now enhanced with **LangChain @tool decorators** and **proper LangChain architecture** for robust email processing.

## ✨ Features

### 🗣️ **Conversational Interface**
- **Natural Chat Experience**: Type requests in plain English like "Write a proposal to decline this meeting"
- **Streaming Responses**: Real-time, word-by-word AI responses
- **Smart Suggestions**: Quick action buttons for common tasks including LangChain features
- **Context Awareness**: AI understands email content and conversation history

### 🔧 **Smart Email Actions**
- **Email Composition**: Generate professional replies, declinations, proposals
- **Content Analysis**: Summarize emails, extract tasks, analyze sentiment  
- **Outlook Integration**: Seamlessly opens AI-generated emails in Outlook for editing
- **Multiple Formats**: Handles various email types and languages

### 🤖 **LangChain Agent Features**
- **Exchange Integration**: Process new emails directly from Exchange servers
- **Automatic Email Polling**: Background scheduler monitors for new emails (every 2 minutes)
- **Tool Discovery**: View all available LangChain @tool decorated functions
- **Real-time Progress**: Live progress bars for email processing operations
- **Scheduler Control**: Start/stop automatic email monitoring from the UI

### 🤝 **Human-in-the-Loop Workflow**
- **Smart Approval System**: Context-aware buttons that appear when AI needs feedback
- **Inline Chat Approvals**: Beautiful, chat-integrated approval buttons
- **Revision Support**: Request changes and get improved email proposals
- **Outlook Integration**: Seamless handoff to Outlook for final editing

## Architecture

This is the **client-side** component of a separated architecture:

- **Outlook Add-in** (this project): Enhanced UI client using TypeScript/Office.js with LangChain integration
- **LangChain Email Agent** (separate project): Python FastAPI + LangChain @tool decorators + LangGraph backend

### 🏗️ **New LangChain Architecture**

The backend now follows **proper LangChain patterns**:

```
┌─── Microsoft Exchange ─────┐    ┌─── LLM ─────────────────────┐
│  📧 Email 1                │    │  🧠 Claude/GPT              │
│  📧 Email 2                │ ←──┤  📝 Classify & Reason       │
│  📧 ...                    │    │  🎯 Auto-respond/Review     │
└────────────────────────────┘    └─────────────────────────────┘
           │                                    │
           ▼                                    ▼
    ┌─── @tool ───────┐                ┌─── Agent ────┐
    │ get_new_emails  │◄───────────────┤ 🤖 LangGraph │
    │ send_reply      │                │ Workflow     │
    │ mark_as_read    │                └──────────────┘
    └─────────────────┘                        │
                                               │
    ┌─── @tool ───────┐                        │
    │ process_content │◄───────────────────────┤
    │ search_similar  │                        │
    │ generate_embed  │                        │
    └─────────────────┘                        │
                │                              │
                ▼                              ▼
    ┌─── @tool ───────┐                ┌─── Database ───┐
    │ store_email     │◄───────────────┤ 🗄️ Supabase    │
    │ store_analysis  │                │ PGVector       │
    │ get_history     │                │ Persistence    │
    └─────────────────┘                └────────────────┘
```

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
   - *"Check scheduler status"*
   - *"Show available tools"*
3. **Get Instant Responses**: AI responds in real-time with relevant information

### **LangChain Agent Features**
Use the new feature buttons for advanced functionality:
- **📧 Process New Emails** → Manually trigger Exchange email processing
- **📊 Scheduler Status** → Check automatic email polling status
- **⏰ Toggle Scheduler** → Start/stop background email monitoring
- **🛠️ Show Tools** → View all available LangChain @tool functions
- **📈 Show Progress** → Monitor real-time processing progress

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
- **⏰ Scheduler** → Check automatic email polling status
- **🛠️ Tools** → View available LangChain tools

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

### **LangChain Integration**
Enhanced with **proper LangChain @tool decorator patterns**:
- **Tool Discovery**: UI automatically discovers and displays available @tool functions
- **Progress Tracking**: Real-time progress bars for email processing operations  
- **Scheduler Control**: Start/stop automatic email polling via API endpoints
- **System Status**: Monitor Exchange, Database, and LLM connectivity
- **Vector Search**: Integration with email embedding and similarity search
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