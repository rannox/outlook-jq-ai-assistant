# JQuad AI Assistant - Outlook Add-in

A simplified Outlook add-in developed by [JQuad](https://www.jquad.rocks/) that integrates with an AI agent service to provide intelligent email assistance with human-in-the-loop capabilities.

## Features

- **Smart Email Processing**: AI-powered email analysis and response generation
- **Human-in-the-Loop**: Review and approve AI suggestions before applying
- **Real-time Updates**: WebSocket integration for live processing feedback
- **Multiple Actions**: 
  - Compose Reply
  - Summarize Email
  - Analyze Sentiment
  - Extract Tasks

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

## Usage

1. **Select an Email**: Open any email in Outlook
2. **Open Add-in**: Click the "AI Assistant" button in the ribbon
3. **Choose Action**: Select from the available quick actions
4. **Review & Approve**: When the AI makes suggestions, review and approve/edit/reject
5. **Apply Results**: Approved content is automatically applied to your email

## Human-in-the-Loop Workflow

1. AI analyzes email and proposes an action
2. User sees a dialog with the proposed action details
3. User can:
   - **Accept**: Apply the action as-is
   - **Edit**: Modify the action parameters
   - **Respond**: Provide feedback for the AI to incorporate
   - **Reject**: Cancel the action

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

## Development Tips

1. **Hot Reload**: The dev server supports hot reload for faster development
2. **Debugging**: Use browser dev tools when running in Outlook on the web
3. **Manifest Changes**: Restart Outlook after modifying `manifest.xml`
4. **HTTPS Required**: Outlook requires HTTPS for add-ins (dev server provides this)

## License

MIT License - see LICENSE file for details

## Related Projects

- **Agent Service**: The Python FastAPI + LangGraph backend that powers this add-in