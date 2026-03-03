import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import {
    ClipboardCheck,
    Target,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Info,
    DollarSign,
    Users,
    Briefcase
} from 'lucide-react';
import './BusinessDiagnosis.css';

const BusinessDiagnosis = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Para começar seu Raio-X de 40 pontos, me diga: Qual seu nome e qual foi seu faturamento nos últimos 30 dias?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [diagnosis, setDiagnosis] = useState(null);
    const [stage, setStage] = useState(null);

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

            const assistantMsg = response.data.response;
            setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);

            // Se a IA finalizar o diagnóstico, processar a resposta
            if (assistantMsg.includes('DIAGNÓSTICO CONCLUÍDO')) {
                extractDiagnosisData(assistantMsg);
            }
        } catch (error) {
            console.error('Erro no diagnóstico:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const extractDiagnosisData = (text) => {
        // Lógica para extrair estágio e gargalo do texto da IA
        const stageMatch = text.match(/Estágio (\d)/);
        if (stageMatch) setStage(stageMatch[1]);

        setDiagnosis({
            text: text,
            date: new Date().toLocaleDateString()
        });
    };

    return (
        <div className="diagnosis-container">
            <div className="diagnosis-header">
                <ClipboardCheck size={28} />
                <div>
                    <h1>Diagnóstico Estratégico</h1>
                    <p>Identifique seus gargalos e saia do operacional</p>
                </div>
            </div>

            {!diagnosis ? (
                <div className="diagnosis-chat-wrapper">
                    <div className="diagnosis-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`diag-msg ${msg.role}`}>
                                <div className="msg-bubble">{msg.content}</div>
                            </div>
                        ))}
                        {isLoading && <div className="diag-msg assistant loading">Analisando...</div>}
                    </div>
                    <form onSubmit={handleSend} className="diag-input-area">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Responda aqui..."
                        />
                        <button type="submit">Enviar</button>
                    </form>
                </div>
            ) : (
                <div className="diagnosis-result">
                    <div className="result-card stage-card">
                        <h3>Estágio do Negócio</h3>
                        <div className="stage-indicator">
                            <span className={`badge stage-${stage}`}>Estágio {stage}</span>
                        </div>
                        <p>{diagnosis.text.split('Agora sim')[0]}</p>
                    </div>

                    <div className="action-buttons">
                        <button className="btn-primary">Gerar Plano de Ação de 30 Dias</button>
                        <button className="btn-secondary">Agendar Call com Especialista</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessDiagnosis;
