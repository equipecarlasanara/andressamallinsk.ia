import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import {
    Send,
    Bot,
    User,
    Loader2,
    BarChart3,
    CheckCircle2,
    Target,
    TrendingUp,
    ChevronRight
} from 'lucide-react';
import './EstrategistaDigital.css';

const EstrategistaDigital = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Para começar seu Raio-X de 40 pontos, me diga: Qual seu nome e qual foi seu faturamento nos últimos 30 dias?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/ai/chat`, {
                message: userMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const assistantResponse = response.data.response;
            setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);

            // Mostrar opções de ajuda se a IA sugerir um plano ou conselho
            if (assistantResponse.toLowerCase().includes('conselho estratégico') ||
                assistantResponse.toLowerCase().includes('plano de ação')) {
                setShowOptions(true);
            } else {
                setShowOptions(false);
            }
        } catch (error) {
            console.error('Erro ao chamar Estrategista:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Desculpe, tive um problema de conexão. Podemos tentar novamente?'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOptionClick = (option) => {
        setInput(option);
        setShowOptions(false);
        // Disparar o envio automaticamente
        const pseudoEvent = { preventDefault: () => { } };
        setTimeout(() => handleSend(pseudoEvent), 100);
    };

    return (
        <div className="estrategista-container">
            <div className="chat-header">
                <Bot size={24} />
                <div>
                    <h2>Estrategista Digital</h2>
                    <p>Sua operadora de margem 24/7</p>
                </div>
            </div>

            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message-wrapper ${msg.role}`}>
                        <div className="message-icon">
                            {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                        </div>
                        <div className="message-content">
                            {msg.content.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message-wrapper assistant">
                        <div className="message-icon">
                            <Bot size={18} />
                        </div>
                        <div className="message-content loading">
                            <Loader2 className="animate-spin" size={18} />
                            <span>Analisando dados...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-controls">
                {showOptions && (
                    <div className="quick-options">
                        <button onClick={() => handleOptionClick('Desejo um conselho estratégico')}>
                            <Target size={16} />
                            Conselho Estratégico
                        </button>
                        <button onClick={() => handleOptionClick('Desejo o plano de ação de 30 dias')}>
                            <TrendingUp size={16} />
                            Plano de Ação
                        </button>
                    </div>
                )}

                <form onSubmit={handleSend} className="input-form">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua resposta..."
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={!input.trim() || isLoading}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EstrategistaDigital;