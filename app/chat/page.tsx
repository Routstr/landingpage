'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useNostr } from '@/context/NostrContext';
import Header from '@/components/Header';
import { getBalanceFromStoredProofs } from '@/utils/cashuUtils';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';

// Model type definition
interface Model {
  id: string;
  name: string;
  description: string;
  cost_per_1m_prompt_tokens: number;
  cost_per_1m_completion_tokens: number;
  currency: string;
}

// API response model interface
interface ApiModel {
  name: string;
  cost_per_1m_prompt_tokens: number;
  cost_per_1m_completion_tokens: number;
  currency: string;
}

export default function ChatPage() {
  const { isAuthenticated } = useNostr();
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string, content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mintUrl, setMintUrl] = useState('https://mint.minibits.cash/Bitcoin');
  const [conversations, setConversations] = useState<Array<{ id: string, title: string, messages: Array<{ role: string, content: string }> }>>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState(''); // Full accumulated content
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState(''); // New state for inline editing
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false); // New state to track if auth check is complete

  // Define saveCurrentConversation before it's used in useEffect
  const saveCurrentConversation = useCallback(() => {
    if (!activeConversationId) return;

    // Generate a title from the first user message if none exists
    let title = conversations.find(c => c.id === activeConversationId)?.title;
    if (!title || title.startsWith('Conversation ')) {
      const firstUserMessage = messages.find(m => m.role === 'user')?.content;
      if (firstUserMessage) {
        title = firstUserMessage.length > 30
          ? firstUserMessage.substring(0, 30) + '...'
          : firstUserMessage;
      }
    }

    // Update the conversation
    const updatedConversations = conversations.map(conversation => {
      if (conversation.id === activeConversationId) {
        return {
          ...conversation,
          title: title || conversation.title,
          messages: [...messages]
        };
      }
      return conversation;
    });

    setConversations(updatedConversations);
    localStorage.setItem('saved_conversations', JSON.stringify(updatedConversations));
  }, [activeConversationId, conversations, messages]);

  // Fetch available models from API
  const fetchModels = async () => {
    try {
      setIsLoadingModels(true);
      const response = await fetch('https://api.routstr.com/');

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.models && Array.isArray(data.models)) {
        // Transform the API response to match our Model interface
        const formattedModels = data.models.map((model: ApiModel) => ({
          id: model.name,
          name: model.name.split('/').pop() || model.name,
          description: `${model.cost_per_1m_prompt_tokens} ${model.currency}/1M prompt tokens, ${model.cost_per_1m_completion_tokens} ${model.currency}/1M completion tokens`,
          cost_per_1m_prompt_tokens: model.cost_per_1m_prompt_tokens,
          cost_per_1m_completion_tokens: model.cost_per_1m_completion_tokens,
          currency: model.currency
        }));

        setModels(formattedModels);

        // Set default model - either last used or first in the list
        const lastUsedModelId = localStorage.getItem('lastUsedModel');
        if (lastUsedModelId) {
          const lastModel = formattedModels.find((m: Model) => m.id === lastUsedModelId);
          if (lastModel) {
            setSelectedModel(lastModel);
          } else if (formattedModels.length > 0) {
            setSelectedModel(formattedModels[0]);
          }
        } else if (formattedModels.length > 0) {
          setSelectedModel(formattedModels[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setError('Failed to load available models. Please try again later.');
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Get user balance and saved conversations from localStorage on page load
  useEffect(() => {
    // Set a flag that authentication has been checked
    setAuthChecked(true);
    
    // Only redirect if we're sure the user is not authenticated
    if (authChecked && !isAuthenticated) {
      router.push('/');
      return;
    }

    // Only proceed with initialization if authenticated
    if (isAuthenticated) {
      // Get user's mint URL preference from localStorage if it exists
      const storedMintUrl = localStorage.getItem('mint_url');
      if (storedMintUrl) {
        setMintUrl(storedMintUrl);
      }

      // Get balance from stored proofs
      setBalance(getBalanceFromStoredProofs());

      // Try to get the stored token from localStorage
      const storedToken = localStorage.getItem('current_cashu_token');
      if (storedToken) {
        setCurrentToken(storedToken);
      }

      // Load saved conversations
      const savedConversations = localStorage.getItem('saved_conversations');
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }

      // Fetch available models
      fetchModels();
    }
  }, [isAuthenticated, router, authChecked]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // When streaming content updates, scroll to bottom
  useEffect(() => {
    if (streamingContent && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingContent]);

  // Save current conversation to localStorage whenever it changes
  useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      saveCurrentConversation();
    }
  }, [messages, activeConversationId, saveCurrentConversation]);

  // Save mintUrl to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mint_url', mintUrl);
  }, [mintUrl]);

  // Set input message to the content of the message being edited
  useEffect(() => {
    if (editingMessageIndex !== null && messages[editingMessageIndex]) {
      setEditingContent(messages[editingMessageIndex].content);
    }
  }, [editingMessageIndex, messages]);

  const startEditingMessage = (index: number) => {
    setEditingMessageIndex(index);
    setEditingContent(messages[index].content);
  };

  const cancelEditing = () => {
    setEditingMessageIndex(null);
    setEditingContent('');
  };

  const saveInlineEdit = async () => {
    if (editingMessageIndex !== null && editingContent.trim()) {
      // Update the message
      const updatedMessages = [...messages];
      updatedMessages[editingMessageIndex] = {
        ...updatedMessages[editingMessageIndex],
        content: editingContent
      };

      // Truncate all messages after the edited one
      const truncatedMessages = updatedMessages.slice(0, editingMessageIndex + 1);

      setMessages(truncatedMessages);
      setEditingMessageIndex(null);
      setEditingContent('');

      // Now trigger a new response from the AI
      await fetchAIResponse(truncatedMessages);
    }
  };

  const fetchAIResponse = async (messageHistory: Array<{ role: string, content: string }>) => {
    setIsLoading(true);
    setError('');
    setStreamingContent('');

    try {
      let token = '';

      // Check if we have a valid token already
      if (currentToken) {
        token = currentToken;
        console.log("Reusing existing token");
      } else {
        // Get stored proofs
        const storedProofs = localStorage.getItem('cashu_proofs');
        if (!storedProofs) {
          throw new Error('No Cashu tokens found. Please mint some tokens first.');
        }

        const proofs = JSON.parse(storedProofs);

        // Amount to spend for this request
        const amount = 12;

        // Initialize wallet for this mint
        const mint = new CashuMint(mintUrl);
        const wallet = new CashuWallet(mint);
        await wallet.loadMint();

        // Generate the token using the wallet directly
        const { send, keep } = await wallet.send(amount, proofs);

        if (!send || send.length === 0) {
          throw new Error('Failed to generate token');
        }

        // Update stored proofs with remaining proofs
        localStorage.setItem('cashu_proofs', JSON.stringify(keep));

        // Update the balance
        setBalance(getBalanceFromStoredProofs());

        // Create a token string in the proper Cashu format
        const tokenObj = {
          token: [{ mint: mintUrl, proofs: send }]
        };

        token = `cashuA${btoa(JSON.stringify(tokenObj))}`;
        console.log("Generated token:", token);

        // Store the token in state and localStorage
        setCurrentToken(token);
        localStorage.setItem('current_cashu_token', token);
      }

      // Call the API with the token and handle streaming response
      const response = await fetch('https://api.routstr.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: selectedModel?.id,
          messages: messageHistory,
          stream: true // Request streaming response
        })
      });

      if (!response.ok) {
        // If the token is invalid or expired, clear it and retry
        if (response.status === 401 || response.status === 403) {
          console.log("Token invalid or expired, clearing and retrying next time");
          setCurrentToken(null);
          localStorage.removeItem('current_cashu_token');
        }
        throw new Error(`API error: ${response.status}`);
      }

      // Handle the streaming response
      if (!response.body) {
        throw new Error('Response body is not available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and process it
        const chunk = decoder.decode(value, { stream: true });

        try {
          // Process the chunk - typically the format is "data: {...}\n\n"
          const lines = chunk.split('\n');

          for (const line of lines) {
            // Skip empty lines
            if (!line.trim()) continue;

            // SSE format starts with "data: "
            if (line.startsWith('data: ')) {
              const jsonData = line.slice(6); // Remove the "data: " prefix

              // The "[DONE]" message indicates the end of the stream
              if (jsonData === '[DONE]') continue;

              try {
                const parsedData = JSON.parse(jsonData);

                // Extract the content if it exists
                if (parsedData.choices &&
                  parsedData.choices[0] &&
                  parsedData.choices[0].delta &&
                  parsedData.choices[0].delta.content) {

                  // Get the new content chunk
                  const newContent = parsedData.choices[0].delta.content;

                  // Update the accumulated content
                  accumulatedContent += newContent;

                  // Update the full content 
                  setStreamingContent(accumulatedContent);
                }
              } catch (parseError) {
                console.warn('Error parsing chunk:', parseError);
              }
            }
          }
        } catch (chunkError) {
          console.warn('Error processing chunk:', chunkError);
        }
      }

      // When streaming is done, add the complete response to messages
      if (accumulatedContent) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: accumulatedContent
        }]);
      }

      // Clear streaming response after adding to messages
      setStreamingContent('');

    } catch (err: unknown) {
      console.error('Operation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process your request');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Create a new conversation if none exists
    if (!activeConversationId) {
      createNewConversation();
    }

    // Add user message to chat history
    const userMessage = { role: 'user', content: inputMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Reset input
    setInputMessage('');

    // Fetch response from AI
    await fetchAIResponse(updatedMessages);
  };

  // Create a new conversation
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      title: `Conversation ${conversations.length + 1}`,
      messages: []
    };

    setConversations(prev => [...prev, newConversation]);
    setActiveConversationId(newId);
    setMessages([]);

    // Save to localStorage
    localStorage.setItem('saved_conversations', JSON.stringify([...conversations, newConversation]));
  };

  // Load a conversation
  const loadConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversationId(conversationId);
      setMessages(conversation.messages);
    }
  };

  // Delete a conversation
  const deleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);

    // If deleting the active conversation, clear the messages
    if (conversationId === activeConversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }

    localStorage.setItem('saved_conversations', JSON.stringify(updatedConversations));
  };

  // Placeholder function to handle model change
  const handleModelChange = (modelId: string) => {
    const model = models.find((m: Model) => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      // Save the selected model in localStorage
      localStorage.setItem('lastUsedModel', modelId);
      // Clear token when model changes as it might not be valid for the new model
      setCurrentToken(null);
    }
  };

  // Filter models based on search query
  const filteredModels = models.filter((model: Model) =>
    model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    model.id.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    model.description.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );

  // Render loading state if auth is still being checked
  if (!authChecked) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="bg-white/5 rounded-lg p-6 text-center">
            <p>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  // Render login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="bg-white/5 rounded-lg p-6 text-center">
            <p>Please log in to access the chat.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <div className="container mx-auto px-4 py-6 flex flex-1 h-[calc(100vh-64px)]">
        {/* Sidebar with model selection */}
        <div className="w-64 mr-6 h-full flex flex-col">
          {/* Balance Card */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-5 mb-4">
            <p className="text-xs text-gray-400 mb-1">Available Balance</p>
            <div className="flex items-center">
              <span className="text-2xl font-bold mr-2">{balance}</span>
              <span className="text-sm text-gray-300">sats</span>
            </div>
          </div>

          {/* Conversation Actions */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-5 mb-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Conversations</h3>
              <button
                onClick={createNewConversation}
                className="text-xs text-white bg-white/10 px-2 py-1 rounded hover:bg-white/15 transition-colors"
              >
                New Chat
              </button>
            </div>

            {/* Always show conversations */}
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No saved conversations</p>
              ) : (
                // Reverse the array to show newer conversations first
                [...conversations].reverse().map(conversation => (
                  <div
                    key={conversation.id}
                    onClick={() => loadConversation(conversation.id)}
                    className={`p-2 rounded text-xs cursor-pointer flex justify-between items-center ${activeConversationId === conversation.id
                      ? 'bg-white/10 text-white'
                      : 'bg-black/30 text-gray-400 hover:bg-black/50 hover:text-gray-300'
                      }`}
                  >
                    <span className="truncate">{conversation.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conversation.id, e)}
                      className="text-gray-400 hover:text-red-400 ml-2"
                    >
                      <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-5 flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium mb-4">Select AI Model</h3>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-xs text-white focus:border-white/30 focus:outline-none"
                />
                {modelSearchQuery && (
                  <button
                    onClick={() => setModelSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isLoadingModels ? (
              <div className="flex justify-center items-center py-6">
                <svg className="animate-spin h-6 w-6 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <>
                {filteredModels.length > 0 ? (
                  <div className="space-y-3">
                    {filteredModels.map((model) => (
                      <div
                        key={model.id}
                        className={`flex flex-col p-3 rounded-lg cursor-pointer ${selectedModel?.id === model.id ? 'bg-white/10 border border-white/20' : 'bg-black/30 border border-white/5 hover:bg-black/50'
                          }`}
                        onClick={() => handleModelChange(model.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{model.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{model.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    <p>No models found matching &quot;{modelSearchQuery}&quot;</p>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-black/30 border border-white/10 rounded-lg overflow-hidden h-full">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 pt-24">
                  <svg className="h-12 w-12 mb-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M8 9h8" />
                    <path d="M8 13h6" />
                  </svg>
                  <p className="text-sm text-center">Send a message to start chatting with {selectedModel?.name}</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 group`}
                  >
                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                      <div
                        className={`rounded-lg p-3 ${message.role === 'user'
                          ? 'bg-indigo-900/30 border border-indigo-800/20 text-gray-100'
                          : 'bg-white/5 border border-white/10 text-gray-200'
                          }`}
                      >
                        {/* Show textarea when editing this message */}
                        {message.role === 'user' && editingMessageIndex === index ? (
                          <div className="flex flex-col w-full">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full bg-indigo-950/50 border border-indigo-700/30 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600/40"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2 mt-2">
                              <button
                                onClick={cancelEditing}
                                className="text-xs text-gray-300 hover:text-white bg-white/10 px-2 py-1 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveInlineEdit}
                                className="text-xs text-gray-100 bg-indigo-700/50 px-2 py-1 rounded hover:bg-indigo-600/60"
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>

                      {/* Edit button below the bubble, only for user messages and not currently editing */}
                      {message.role === 'user' && editingMessageIndex !== index && (
                        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => startEditingMessage(index)}
                            className="p-1 rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                            aria-label="Edit message"
                          >
                            <svg className="w-3 h-3 text-blue-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Streaming response */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg p-3 bg-white/5 border border-white/10 text-gray-200">
                    <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/10 bg-black/40">
            <div className="flex flex-col">
              <div className="flex">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Message ${selectedModel?.name}...`}
                  className="flex-1 bg-black/30 border border-white/10 rounded-l-md px-4 py-3 text-sm focus:border-white/30 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim() || (editingMessageIndex === null)}
                  className="bg-white/10 border border-white/10 text-white px-4 rounded-r-md hover:bg-white/15 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 