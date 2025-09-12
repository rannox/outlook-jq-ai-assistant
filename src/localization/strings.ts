// Localization strings for the JQuad AI Assistant Outlook plugin

export interface LocalizedStrings {
  // Main UI
  appTitle: string;
  app: {
    title: string;
  };
  connectionStatus: {
    connected: string;
    disconnected: string;
  };
  status: {
    ready: string;
    thinking: string;
    waitingForInput: string;
    completed: string;
    cancelled: string;
    error: string;
    connecting: string;
    disconnected: string;
  };
  
  // Email context
  emailContext: {
    title: string;
    subject: string;
    from: string;
    to: string;
    noSubject: string;
    unknownSender: string;
    unknownRecipient: string;
  };
  
  // Buttons and actions
  buttons: {
    extractTasks: string;
    writeReply: string;
    summarize: string;
    sentiment: string;
    classifyEmail: string;
    send: string;
    accept: string;
    edit: string;
    reject: string;
    deny: string;
    save: string;
    cancel: string;
    update: string;
    approve: string;
    openInOutlook: string;
    respond: string;
  };

  // Decision interface
  decision: {
    humanApprovalRequired: string;
    humanDecisionRequired: string;
    aiRecommendation: string;
    chooseAction: string;
    approveIgnore: string;
    processInstead: string;
    approveReply: string;
    sendReply: string;
    editResponse: string;
    editAndSend: string;            // Legacy - deprecated
    editReply: string;              // New: Enter edit mode
    sendEdited: string;             // New: Send edited reply
    saveEdited: string;             // New: Save edited reply
    cancelEdit: string;             // New: Cancel edit
    convertToIgnore: string;
    provideAnswers: string;
    customReply: string;
    denyAction: string;
    proposedResponse: string;
    clarifyingQuestions: string;
    answerQuestions: string;
    provideAnswersInstructions: string;
  };
  
  // Chat interface
  chat: {
    title: string;
    placeholder: string;
    inputPlaceholder: string;
    welcome: string;
    welcomeEnd: string;
    welcomeMessage: string;
    suggestions: {
      extractTasks: string;
      writeReply: string;
      summarize: string;
      sentiment: string;
    };
    prompts: {
      extractTasks: string;
      writeReply: string;
      summarize: string;
      sentiment: string;
      classify: string;
    };
    responses: {
      thinking: string;
      emailReplyOpened: string;
      replyCancelled: string;
      notesUpdated: string;
      notesSaved: string;
      editCancelled: string;
      actionCancelled: string;
      proposalAccepted: string;
      clipboardCopied: string;
      outlookComposeOpened: string;
      autoReplySent: string;
      answerSubmitted: string;
      decisionProcessed: string;
      openingOutlookWithProposed: string;
      openingOutlookWithEdited: string;
      outlookReplyOpened: string;
      outlookComposeFailed: string;
    };
  };
  
  // Direct suggestion properties for backward compatibility
  suggestions: {
    extractTasks: string;
    writeReply: string;
    summarize: string;
    sentiment: string;
    classify: string;
  };
  
  // Classification results
  classification: {
    title: string;
    confidence: string;
    reasoning: string;
    category: string;
    priority: string;
    action: string;
    summary: string;
    types: {
      ignore: string;
      autoReply: string;
      informationNeeded: string;
    };
    values: {
      unknown: string;
      normal: string;
      none: string;
    };
    suggestedResponse: string;
    guidanceNeeded: string;
    humanApprovalRequired: string;
    proposedResponse: string;
    clarifyingQuestions: string;
  };
  
  // Editor interfaces
  editor: {
    editDraftEmail: string;
    editAutoResponse: string;
    editReply: string;
    answerQuestions: string;
    notesLabel: string;
    to: string;
    subject: string;
    body: string;
    notes: string;
    placeholder: {
      editReply: string;
      editNotes: string;
      answerQuestions: string;
      provideAnswers: string;
    };
  };
  
  // Error messages
  errors: {
    officeNotReady: string;
    connectionFailed: string;
    initializationFailed: string;
    agentServiceUnavailable: string;
    noEmailContext: string;
    failedToLoadEmail: string;
    classificationFailed: string;
    processingError: string;
    outlookComposeFailed: string;
    clipboardFailed: string;
    generalError: string;
  };
  
  // Success messages
  success: {
    emailContextLoaded: string;
    connectionEstablished: string;
    taskCompleted: string;
    emailSent: string;
    changesSaved: string;
  };
  
  // Processing states
  processing: {
    loading: string;
    analyzing: string;
    generating: string;
    sending: string;
    saving: string;
    connecting: string;
    startingClassification: string;
    nextDecisionRequired: string;
    processingDecision: string;
    workflowContinues: string;
  };

  // Workflow states
  workflow: {
    alreadyProcessed: string;
    alreadyCompletedMessage: string;
    completed: string;
    classification: string;
    finalReply: string;
  };
}

// English strings
export const EN_STRINGS: LocalizedStrings = {
  appTitle: "JQuad AI Assistant",
  app: {
    title: "JQuad AI Assistant"
  },
  connectionStatus: {
    connected: "Connected to agent service",
    disconnected: "Disconnected from agent service"
  },
  status: {
    ready: "Ready",
    thinking: "AI is thinking...",
    waitingForInput: "Waiting for your input",
    completed: "Task completed",
    cancelled: "Action cancelled",
    error: "An error occurred",
    connecting: "Connecting to service...",
    disconnected: "Service unavailable"
  },
  
  emailContext: {
    title: "Current Email",
    subject: "Subject:",
    from: "From:",
    to: "To:",
    noSubject: "No subject",
    unknownSender: "Unknown sender",
    unknownRecipient: "Unknown recipient"
  },
  
  buttons: {
    extractTasks: "Extract Tasks",
    writeReply: "Write Reply",
    summarize: "Summarize",
    sentiment: "Sentiment",
    classifyEmail: "Classify Email",
    send: "Send",
    accept: "Accept",
    edit: "Edit",
    reject: "Reject",
    deny: "Deny",
    save: "Save",
    cancel: "Cancel",
    update: "Update",
    approve: "Approve",
    openInOutlook: "Open in Outlook",
    respond: "Respond"
  },

  // Decision interface
  decision: {
    humanApprovalRequired: "Human Approval Required",
    humanDecisionRequired: "Human decision required - please review the classification...",
    aiRecommendation: "AI Recommendation",
    chooseAction: "Choose your action:",
    approveIgnore: "Approve Ignore",
    processInstead: "Process Instead",
    approveReply: "Approve & Send",
    sendReply: "Send Reply",
    editResponse: "Edit Response",
    editAndSend: "Edit & Send",           // Legacy - deprecated
    editReply: "Edit Reply",              // New: Enter edit mode
    sendEdited: "Send Edited Reply",       // New: Send edited reply
    saveEdited: "Save Edited Reply",       // New: Save edited reply
    cancelEdit: "Cancel Edit",             // New: Cancel edit
    convertToIgnore: "Convert to Ignore",
    provideAnswers: "Provide Answers",
    customReply: "Custom Reply",
    denyAction: "Deny",
    proposedResponse: "Proposed Response",
    clarifyingQuestions: "Clarifying Questions",
    answerQuestions: "Answer Clarifying Questions",
    provideAnswersInstructions: "Please provide answers to help generate a proper response:"
  },
  
  chat: {
    title: "Chat with AI Assistant",
    placeholder: "Ask me anything about this email... (Press Enter to send, Shift+Enter for new line)",
    inputPlaceholder: "Ask me anything about this email... (Press Enter to send, Shift+Enter for new line)",
    welcome: "Hi! I can help you with this email. Try asking me:",
    welcomeEnd: "Or just ask me anything about the email!",
    welcomeMessage: `Hi! I can help you with this email. Try asking me:
• "Extract the key tasks from this email"
• "Write a professional reply"
• "Summarize this email"
• "What's the sentiment here?"
Or just ask me anything about the email!`,
    suggestions: {
      extractTasks: "Extract Tasks",
      writeReply: "Write Reply",
      summarize: "Summarize",
      sentiment: "Sentiment"
    },
    prompts: {
      extractTasks: "Extract the key tasks from this email",
      writeReply: "Write a professional email reply to this email", 
      summarize: "Summarize this email",
      sentiment: "What's the sentiment of this email?",
      classify: "Classify this email"
    },
    responses: {
      thinking: "I'm thinking about your request...",
      emailReplyOpened: "Email reply window opened! You can edit and send the email from there.",
      replyCancelled: "Reply cancelled.",
      notesUpdated: "Notes updated successfully!",
      notesSaved: "Notes saved! You can now draft a reply or continue working with this email.",
      editCancelled: "Edit cancelled. No changes were saved.",
      actionCancelled: "Action cancelled by user",
      proposalAccepted: "Perfect! I've copied the proposal to your clipboard.",
      clipboardCopied: "You can now paste it into any document, email, or application where you need it.",
      outlookComposeOpened: "Outlook compose window opened with auto-reply text",
      autoReplySent: "Auto-reply sent successfully!",
      answerSubmitted: "Answers submitted successfully! AI is generating response...",
      decisionProcessed: "Decision processed successfully!",
      openingOutlookWithProposed: "Opening Outlook reply window with proposed content...",
      openingOutlookWithEdited: "Opening Outlook with your edited reply...",
      outlookReplyOpened: "Outlook compose window opened with your edited reply! You can review and send the email from there.",
      outlookComposeFailed: "Failed to open Outlook compose window. Please copy the text manually."
    }
  },
  
  // Direct suggestion properties for backward compatibility
  suggestions: {
    extractTasks: "Extract Tasks",
    writeReply: "Write Reply", 
    summarize: "Summarize",
    sentiment: "Sentiment",
    classify: "Classify Email"
  },
  
  classification: {
    title: "Email Classification",
    confidence: "confidence",
    reasoning: "Reasoning",
    category: "Category:",
    priority: "Priority:",
    action: "Action Required:",
    summary: "Summary:",
    types: {
      ignore: "IGNORE",
      autoReply: "AUTO-REPLY",
      informationNeeded: "INFORMATION-NEEDED"
    },
    values: {
      unknown: "Unknown",
      normal: "Normal",
      none: "None"
    },
    suggestedResponse: "Suggested Response",
    guidanceNeeded: "Specific Guidance Needed",
    humanApprovalRequired: "Human Approval Required",
    proposedResponse: "Proposed Response:",
    clarifyingQuestions: "Clarifying Questions:"
  },
  
  editor: {
    editDraftEmail: "Edit Draft Email",
    editAutoResponse: "Edit Auto-Response",
    editReply: "Edit Reply",
    answerQuestions: "Answer Clarifying Questions",
    notesLabel: "Your Notes & Answers",
    to: "To:",
    subject: "Subject:",
    body: "Body:",
    notes: "Notes for AI (optional):",
    placeholder: {
      editReply: "Edit your reply here...",
      editNotes: "Add your notes, answers to the questions, or any relevant information...",
      answerQuestions: "Please provide your answers to the questions above...",
      provideAnswers: "Describe the changes you want..."
    }
  },
  
  errors: {
    officeNotReady: "Office.js is not ready. Please refresh the page.",
    connectionFailed: "Failed to initialize. Please check agent service connection.",
    initializationFailed: "Failed to initialize. Please check agent service connection.",
    agentServiceUnavailable: "Cannot connect to agent service. Please ensure it is running on localhost:8000",
    noEmailContext: "No email context available. Please select an email first.",
    failedToLoadEmail: "Failed to load email context",
    classificationFailed: "Failed to classify email. Please check the agent service connection.",
    processingError: "An error occurred during processing",
    outlookComposeFailed: "Could not open Outlook compose window. You can copy the text manually.",
    clipboardFailed: "Copy the text above and paste it where you need it.",
    generalError: "An unexpected error occurred. Please refresh the page."
  },
  
  success: {
    emailContextLoaded: "Email context loaded successfully",
    connectionEstablished: "Connected to agent service",
    taskCompleted: "Task completed successfully",
    emailSent: "Email sent successfully",
    changesSaved: "Changes saved successfully"
  },
  
  processing: {
    loading: "Loading...",
    analyzing: "Analyzing email...",
    generating: "Generating response...",
    sending: "Sending email...",
    saving: "Saving changes...",
    connecting: "Connecting to service...",
    startingClassification: "Starting email classification workflow...",
    nextDecisionRequired: "Next decision required - please review the updated classification...",
    processingDecision: "Processing decision:",
    workflowContinues: "Workflow continues - getting next classification..."
  },

  workflow: {
    alreadyProcessed: "Email Already Processed",
    alreadyCompletedMessage: "Workflow for this email was already completed",
    completed: "Completed:",
    classification: "Classification:",
    finalReply: "Final Reply:"
  }
};

// German strings
export const DE_STRINGS: LocalizedStrings = {
  appTitle: "JQuad KI-Assistent",
  app: {
    title: "JQuad KI-Assistent"
  },
  connectionStatus: {
    connected: "Mit Agent-Service verbunden",
    disconnected: "Verbindung zum Agent-Service getrennt"
  },
  status: {
    ready: "Bereit",
    thinking: "KI denkt nach...",
    waitingForInput: "Warte auf Ihre Eingabe",
    completed: "Aufgabe abgeschlossen",
    cancelled: "Aktion abgebrochen",
    error: "Ein Fehler ist aufgetreten",
    connecting: "Verbindung wird hergestellt...",
    disconnected: "Service nicht verfügbar"
  },
  
  emailContext: {
    title: "Aktuelle E-Mail",
    subject: "Betreff:",
    from: "Von:",
    to: "An:",
    noSubject: "Kein Betreff",
    unknownSender: "Unbekannter Absender",
    unknownRecipient: "Unbekannter Empfänger"
  },
  
  buttons: {
    extractTasks: "Aufgaben extrahieren",
    writeReply: "Antwort schreiben",
    summarize: "Zusammenfassen",
    sentiment: "Stimmung",
    classifyEmail: "E-Mail klassifizieren",
    send: "Senden",
    accept: "Akzeptieren",
    edit: "Bearbeiten",
    reject: "Ablehnen",
    deny: "Verweigern",
    save: "Speichern",
    cancel: "Abbrechen",
    update: "Aktualisieren",
    approve: "Genehmigen",
    openInOutlook: "In Outlook öffnen",
    respond: "Antworten"
  },

  // Decision interface
  decision: {
    humanApprovalRequired: "Menschliche Genehmigung erforderlich",
    humanDecisionRequired: "Menschliche Entscheidung erforderlich - bitte überprüfen Sie die Klassifizierung...",
    aiRecommendation: "KI-Empfehlung",
    chooseAction: "Wählen Sie Ihre Aktion:",
    approveIgnore: "Ignorieren genehmigen",
    processInstead: "Stattdessen verarbeiten",
    approveReply: "Genehmigen & Senden",
    sendReply: "Antwort senden",
    editResponse: "Antwort bearbeiten",
    editAndSend: "Bearbeiten & Senden",    // Legacy - will be removed
    editReply: "Antwort bearbeiten",       // New: Enter edit mode
    sendEdited: "Bearbeitete Antwort senden", // New: Send edited reply
    saveEdited: "Bearbeitete Antwort speichern", // New: Save edited reply
    cancelEdit: "Bearbeitung abbrechen",   // New: Cancel edit
    convertToIgnore: "Zu Ignorieren konvertieren",
    provideAnswers: "Antworten geben",
    customReply: "Benutzerdefinierte Antwort",
    denyAction: "Verweigern",
    proposedResponse: "Vorgeschlagene Antwort",
    clarifyingQuestions: "Klärende Fragen",
    answerQuestions: "Klärende Fragen beantworten",
    provideAnswersInstructions: "Bitte geben Sie Antworten an, um eine angemessene Antwort zu generieren:"
  },
  
  chat: {
    title: "Chat mit KI-Assistent",
    placeholder: "Fragen Sie mich alles über diese E-Mail... (Enter zum Senden, Shift+Enter für neue Zeile)",
    inputPlaceholder: "Fragen Sie mich alles über diese E-Mail... (Enter zum Senden, Shift+Enter für neue Zeile)",
    welcome: "Hallo! Ich kann Ihnen bei dieser E-Mail helfen. Versuchen Sie zu fragen:",
    welcomeEnd: "Oder fragen Sie mich einfach alles über die E-Mail!",
    welcomeMessage: `Hallo! Ich kann Ihnen bei dieser E-Mail helfen. Versuchen Sie zu fragen:
• "Extrahiere die wichtigsten Aufgaben aus dieser E-Mail"
• "Schreibe eine professionelle Antwort"
• "Fasse diese E-Mail zusammen"
• "Wie ist die Stimmung hier?"
Oder fragen Sie mich einfach alles über die E-Mail!`,
    suggestions: {
      extractTasks: "Aufgaben extrahieren",
      writeReply: "Antwort schreiben",
      summarize: "Zusammenfassen",
      sentiment: "Stimmung"
    },
    prompts: {
      extractTasks: "Extrahiere die wichtigsten Aufgaben aus dieser E-Mail",
      writeReply: "Schreibe eine professionelle E-Mail-Antwort auf diese E-Mail",
      summarize: "Fasse diese E-Mail zusammen",
      sentiment: "Wie ist die Stimmung in dieser E-Mail?",
      classify: "Klassifiziere diese E-Mail"
    },
    responses: {
      thinking: "Ich denke über Ihre Anfrage nach...",
      emailReplyOpened: "E-Mail-Antwort-Fenster geöffnet! Sie können die E-Mail dort bearbeiten und senden.",
      replyCancelled: "Antwort abgebrochen.",
      notesUpdated: "Notizen erfolgreich aktualisiert!",
      notesSaved: "Notizen gespeichert! Sie können jetzt eine Antwort entwerfen oder weiter mit dieser E-Mail arbeiten.",
      editCancelled: "Bearbeitung abgebrochen. Keine Änderungen wurden gespeichert.",
      actionCancelled: "Aktion vom Benutzer abgebrochen",
      proposalAccepted: "Perfekt! Ich habe den Vorschlag in Ihre Zwischenablage kopiert.",
      clipboardCopied: "Sie können ihn jetzt in jedes Dokument, E-Mail oder Anwendung einfügen, wo Sie ihn benötigen.",
      outlookComposeOpened: "Outlook-Verfassen-Fenster mit automatischer Antwort geöffnet",
      autoReplySent: "Automatische Antwort erfolgreich gesendet!",
      answerSubmitted: "Antworten erfolgreich übermittelt! KI generiert Antwort...",
      decisionProcessed: "Entscheidung erfolgreich verarbeitet!",
      openingOutlookWithProposed: "Outlook-Antwort-Fenster wird mit vorgeschlagenem Inhalt geöffnet...",
      openingOutlookWithEdited: "Outlook wird mit Ihrer bearbeiteten Antwort geöffnet...",
      outlookReplyOpened: "Outlook-Verfassen-Fenster mit Ihrer bearbeiteten Antwort geöffnet! Sie können die E-Mail dort überprüfen und senden.",
      outlookComposeFailed: "Outlook-Verfassen-Fenster konnte nicht geöffnet werden. Bitte kopieren Sie den Text manuell."
    }
  },
  
  // Direct suggestion properties for backward compatibility
  suggestions: {
    extractTasks: "Aufgaben extrahieren",
    writeReply: "Antwort schreiben",
    summarize: "Zusammenfassen",
    sentiment: "Stimmung",
    classify: "E-Mail klassifizieren"
  },
  
  classification: {
    title: "E-Mail-Klassifizierung",
    confidence: "Konfidenz",
    reasoning: "Begründung",
    category: "Kategorie:",
    priority: "Priorität:",
    action: "Erforderliche Aktion:",
    summary: "Zusammenfassung:",
    types: {
      ignore: "IGNORIEREN",
      autoReply: "AUTO-ANTWORT",
      informationNeeded: "INFORMATIONEN-BENÖTIGT"
    },
    values: {
      unknown: "Unbekannt",
      normal: "Normal",
      none: "Keine"
    },
    suggestedResponse: "Vorgeschlagene Antwort",
    guidanceNeeded: "Spezifische Anleitung benötigt",
    humanApprovalRequired: "Menschliche Genehmigung erforderlich",
    proposedResponse: "Vorgeschlagene Antwort:",
    clarifyingQuestions: "Klärende Fragen:"
  },
  
  editor: {
    editDraftEmail: "E-Mail-Entwurf bearbeiten",
    editAutoResponse: "Automatische Antwort bearbeiten",
    editReply: "Antwort bearbeiten",
    answerQuestions: "Klärende Fragen beantworten",
    notesLabel: "Ihre Notizen & Antworten",
    to: "An:",
    subject: "Betreff:",
    body: "Text:",
    notes: "Notizen für KI (optional):",
    placeholder: {
      editReply: "Bearbeiten Sie Ihre Antwort hier...",
      editNotes: "Fügen Sie Ihre Notizen, Antworten auf die Fragen oder relevante Informationen hinzu...",
      answerQuestions: "Bitte geben Sie Ihre Antworten auf die obigen Fragen...",
      provideAnswers: "Beschreiben Sie die gewünschten Änderungen..."
    }
  },
  
  errors: {
    officeNotReady: "Office.js ist nicht bereit. Bitte aktualisieren Sie die Seite.",
    connectionFailed: "Initialisierung fehlgeschlagen. Bitte überprüfen Sie die Agent-Service-Verbindung.",
    initializationFailed: "Initialisierung fehlgeschlagen. Bitte überprüfen Sie die Agent-Service-Verbindung.",
    agentServiceUnavailable: "Kann keine Verbindung zum Agent-Service herstellen. Bitte stellen Sie sicher, dass er auf localhost:8000 läuft",
    noEmailContext: "Kein E-Mail-Kontext verfügbar. Bitte wählen Sie zuerst eine E-Mail aus.",
    failedToLoadEmail: "Laden des E-Mail-Kontexts fehlgeschlagen",
    classificationFailed: "E-Mail-Klassifizierung fehlgeschlagen. Bitte überprüfen Sie die Agent-Service-Verbindung.",
    processingError: "Ein Fehler ist während der Verarbeitung aufgetreten",
    outlookComposeFailed: "Outlook-Verfassen-Fenster konnte nicht geöffnet werden. Sie können den Text manuell kopieren.",
    clipboardFailed: "Kopieren Sie den obigen Text und fügen Sie ihn ein, wo Sie ihn benötigen.",
    generalError: "Ein unerwarteter Fehler ist aufgetreten. Bitte aktualisieren Sie die Seite."
  },
  
  success: {
    emailContextLoaded: "E-Mail-Kontext erfolgreich geladen",
    connectionEstablished: "Mit Agent-Service verbunden",
    taskCompleted: "Aufgabe erfolgreich abgeschlossen",
    emailSent: "E-Mail erfolgreich gesendet",
    changesSaved: "Änderungen erfolgreich gespeichert"
  },
  
  processing: {
    loading: "Lädt...",
    analyzing: "E-Mail wird analysiert...",
    generating: "Antwort wird generiert...",
    sending: "E-Mail wird gesendet...",
    saving: "Änderungen werden gespeichert...",
    connecting: "Verbindung zum Service wird hergestellt...",
    startingClassification: "E-Mail-Klassifizierungs-Workflow wird gestartet...",
    nextDecisionRequired: "Nächste Entscheidung erforderlich - bitte überprüfen Sie die aktualisierte Klassifizierung...",
    processingDecision: "Entscheidung wird verarbeitet:",
    workflowContinues: "Workflow wird fortgesetzt - nächste Klassifizierung wird abgerufen..."
  },

  workflow: {
    alreadyProcessed: "E-Mail bereits verarbeitet",
    alreadyCompletedMessage: "Der Workflow für diese E-Mail wurde bereits abgeschlossen",
    completed: "Abgeschlossen:",
    classification: "Klassifizierung:",
    finalReply: "Endgültige Antwort:"
  }
};
