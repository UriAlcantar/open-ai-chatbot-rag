import React, { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL

type Msg = { role: 'user' | 'assistant', content: string }

export default function App() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [msgs])

  const send = async () => {
    if (!input.trim()) return
    const next: Msg[] = [...msgs, { role: 'user' as const, content: input }]
    setMsgs(next); setInput(''); setLoading(true)
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: 'You are a helpful and friendly AI assistant. Provide clear, concise, and accurate responses.' }, ...next] })
      })
      const data = await res.json()
               const text = data?.text || 'Sorry, I encountered an error. Please try again.'
         const contextUsed = data?.context_used || false
         const documentsFound = data?.documents_found || 0
         const webSearchUsed = data?.web_search_used || false
         const weatherUsed = data?.weather_used || false
         const sources = data?.sources || { local: false, web: false, weather: false }
      
      let responseText = text
               let sourceInfo = ''
         
         if (sources.weather) {
           sourceInfo = `\n\n🌤️ *Información del clima obtenida de OpenWeatherMap*`
         } else if (sources.local && sources.web) {
           sourceInfo = `\n\n🔗 *Respuesta híbrida: ${documentsFound} documento(s) local + búsqueda web*`
         } else if (sources.local) {
           sourceInfo = `\n\n📚 *Respuesta basada en ${documentsFound} documento(s) de la base de conocimientos*`
         } else if (sources.web) {
           sourceInfo = `\n\n🌐 *Respuesta basada en búsqueda web (no se encontró información local)*`
         } else {
           sourceInfo = `\n\n💡 *Respuesta general del modelo AI*`
         }
      
      responseText += sourceInfo
      setMsgs([...next, { role: 'assistant' as const, content: responseText }])
    } catch (e) {
      setMsgs([...next, { role: 'assistant' as const, content: 'Sorry, I\'m having trouble connecting right now. Please check your connection and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const clearChat = () => {
    setMsgs([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
              <p className="text-sm text-gray-400">Powered by OpenAI GPT-4</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors duration-200"
          >
            Clear Chat
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-600">
          {msgs.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to AI Assistant</h3>
              <p className="text-gray-400">Start a conversation by typing a message below.</p>
            </div>
          )}
          
                     {msgs.map((m, i) => (
             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`p-4 rounded-lg mb-4 max-w-4xl ${m.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-700 text-gray-100'}`}>
                <div className="flex items-start space-x-3">
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                      {m.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                                     {m.role === 'user' && (
                     <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
                     {loading && (
             <div className="flex justify-start">
               <div className="p-4 rounded-lg mb-4 max-w-4xl bg-gray-700 text-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">AI Assistant</div>
                                         <div className="flex space-x-2 p-4">
                       <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                       <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                       <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Container */}
        <div className="p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-600">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                className="w-full p-4 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                rows={1}
                style={{ minHeight: '60px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
