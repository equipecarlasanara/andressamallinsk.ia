import { Copy, Check, Terminal, Search, Zap, Target, TrendingUp, Users, Layout, Anchor, Eye, BarChart3, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const promptCategories = [
    {
        name: "🔍 Diagnóstico",
        icon: Search,
        prompts: [
            {
                id: 1,
                title: "Diagnóstico Completo",
                description: "Gere um diagnóstico estratégico real do seu momento.",
                command: "Meu nome é ______. Vou responder suas perguntas sobre meu negócio e quero que você gere um diagnóstico estratégico real do meu momento. Com base nas minhas respostas: - Classifique o estágio do meu negócio - Identifique o gargalo dominante - Mostre onde o dinheiro está travado - Defina prioridade única - Gere um plano de 7 dias Seja direta, estratégica e sem respostas genéricas."
            },
            {
                id: 2,
                title: "Diagnóstico Rápido de Gargalo",
                description: "Descubra onde você está perdendo dinheiro agora.",
                command: "Essa é a realidade atual do meu negócio: ______. Sem rodeios, me diga: - Onde está meu principal gargalo? - O que está me fazendo perder dinheiro? - O que eu preciso parar de fazer imediatamente? - Qual deve ser meu foco único nos próximos 15 dias?"
            }
        ]
    },
    {
        name: "📱 Perfil IG",
        icon: Eye,
        prompts: [
            {
                id: 3,
                title: "Análise Estratégica de Perfil",
                description: "Auditoria completa do seu perfil Instagram.",
                command: "Esse é meu perfil atual: Nome: Bio: Posicionamento: Paleta de cores: Tipo de conteúdo: Oferta principal: Faça uma análise estratégica do meu perfil considerando: - Clareza de posicionamento - Autoridade - Capacidade de conversão - Alinhamento com minha oferta Me diga o que manter, o que cortar e o que ajustar."
            },
            {
                id: 4,
                title: "Bio Magnética",
                description: "3 versões de bio estratégicas focadas em venda.",
                command: "Minha oferta é: Meu público é: Meu diferencial é: Crie 3 versões de bio estratégica focadas em conversão e clareza. Nada genérico. Quero posicionamento forte."
            },
            {
                id: 5,
                title: "Auditoria de Conteúdo",
                description: "Seu conteúdo gera autoridade ou só barulho?",
                command: "Esse é o tipo de conteúdo que eu posto: ______. Analise se ele gera: - Autoridade - Desejo - Conversão Se não estiver estratégico, me diga o que ajustar e qual linha editorial seguir."
            }
        ]
    },
    {
        name: "🧠 Estrategista",
        icon: Target,
        prompts: [
            {
                id: 6,
                title: "Plano 30 Dias",
                description: "Plano mensal, semanal e diário estratégico.",
                command: "Esse é meu diagnóstico completo: ______. Leia com atenção e crie: - Plano mensal estratégico - Plano semanal com foco diferente a cada semana - Plano diário (segunda a sexta) - Métrica principal de acompanhamento Sem repetir tarefas iguais entre semanas."
            },
            {
                id: 7,
                title: "Ajuste de Estratégia",
                description: "Correção de rota no meio do ciclo.",
                command: "Estou no dia ___ do meu plano de 30 dias. Esses são meus resultados até agora: ______. Analise os números e me diga: - O que manter - O que ajustar - O que cortar - Qual deve ser o foco da próxima semana"
            }
        ]
    },
    {
        name: "🌪️ Funis",
        icon: Layout,
        prompts: [
            {
                id: 8,
                title: "Construção de Funil",
                description: "Funil personalizado para seu estágio.",
                command: "Essa é a realidade atual do meu negócio: ______. Minha meta é: ______. Crie um funil de vendas estratégico baseado no meu estágio atual. Defina: - Etapa de aquisição - Qualificação - Conversão - Follow-up - Métricas Não crie funil genérico."
            },
            {
                id: 9,
                title: "Funil para High Ticket",
                description: "Estratégia para produtos de alto valor.",
                command: "Meu produto high ticket é: ______. Meu ticket médio é: ______. Crie um funil estratégico adequado para high ticket. Defina o que deve ser humano e o que pode ser automatizado."
            },
            {
                id: 10,
                title: "Diagnóstico de Funil",
                description: "Encontre os vazamentos do seu funil atual.",
                command: "Meu funil atual funciona assim: ______. Identifique: - Onde está o vazamento - O que está desalinhado - Qual é o gargalo dominante - O que deve ser ajustado primeiro"
            }
        ]
    },
    {
        name: "💰 Vendas",
        icon: Zap,
        prompts: [
            {
                id: 11,
                title: "Roteiro de Conversa",
                description: "Script estratégico para Direct/Whats.",
                command: "Meu produto é: Meu público é: Objeção mais comum é: Crie um roteiro estratégico de conversa no direct com: - Abertura - Qualificação - Condução - Transição para proposta - Follow-up"
            },
            {
                id: 12,
                title: "Resposta 'Vou Pensar'",
                description: "Como reverter sem perder autoridade.",
                command: "Recebi essa resposta: “vou pensar”. Crie uma resposta estratégica que: - Não pressione - Não desvalorize o preço - Conduza para decisão - Mantenha autoridade"
            },
            {
                id: 13,
                title: "Aumento de Ticket",
                description: "Analise por que você está vendendo barato.",
                command: "Quero aumentar meu ticket médio. Hoje eu vendo por ______. Analise se meu problema é: - Oferta - Percepção de valor - Público errado - Conversão fraca E me diga o que ajustar primeiro."
            }
        ]
    },
    {
        name: "📈 Métricas",
        icon: TrendingUp,
        prompts: [
            {
                id: 14,
                title: "Análise de Números",
                description: "Transforme dados brutos em lucro.",
                command: "Esses são meus números: Leads semanais: Conversas iniciadas: Propostas enviadas: Vendas fechadas: Ticket médio: Faça uma análise estratégica. Onde está o gargalo? Qual deve ser meu foco?"
            },
            {
                id: 15,
                title: "Pronto para Escalar?",
                description: "Valide se sua estrutura aguenta o próximo nível.",
                command: "Minha estrutura hoje é: Oferta: Conversão: Equipe: Analise se estou pronta para escalar. Se não estiver, o que precisa estar sólido antes?"
            }
        ]
    },
    {
        name: "🏗️ Processos",
        icon: Anchor,
        prompts: [
            {
                id: 16,
                title: "Criar Playbook Comercial",
                description: "Estruture sua máquina de vendas.",
                command: "Quero estruturar meu processo de vendas. Hoje ele funciona assim: ______. Crie um playbook simples com: - Etapas - Responsáveis - Métricas - Rotina diária"
            },
            {
                id: 17,
                title: "Delegação Estratégica",
                description: "O que passar para equipe para crescer.",
                command: "Tenho ___ pessoas na equipe. Essas são as funções atuais: ______. Me diga o que devo delegar primeiro para destravar crescimento."
            }
        ]
    },
    {
        name: "🏆 Autoridade",
        icon: BarChart3,
        prompts: [
            {
                id: 18,
                title: "Diferenciação de Mercado",
                description: "Destaque-se em um mercado saturado.",
                command: "Meu nicho é: Meus concorrentes fazem: Me ajude a criar diferenciação real. Quero fugir do posicionamento genérico."
            },
            {
                id: 19,
                title: "Mensagem Magnética",
                description: "Fale o que seu cliente precisa ouvir.",
                command: "Minha oferta é: Minha cliente ideal sente: Crie uma mensagem forte que gere: - Identificação - Autoridade - Desejo de conversar"
            }
        ]
    },
    {
        name: "🎯 Foco Único",
        icon: ShieldAlert,
        prompts: [
            {
                id: 20,
                title: "Foco Único",
                description: "A prioridade máxima dos seus próximos 14 dias.",
                command: "Estou confusa e fazendo muitas coisas ao mesmo tempo. Minha realidade atual é: ______. Me diga: - O que cortar - O que manter - O que priorizar - Qual deve ser o foco único pelos próximos 14 dias"
            }
        ]
    }
];

export default function PromptLibrary() {
    const [copiedId, setCopiedId] = useState(null);
    const [activeCategory, setActiveCategory] = useState(promptCategories[0].name);

    const handleCopy = (id, text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const currentPrompts = promptCategories.find(c => c.name === activeCategory)?.prompts || [];

    return (
        <div className="h-full flex flex-col bg-[#19161B] overflow-hidden">
            {/* Header */}
            <div className="p-8 pb-4 shrink-0">
                <h1 className="text-4xl font-title text-[#D4AF37] mb-2 shadow-sm">Biblioteca de Prompts</h1>
                <p className="text-[#CBC8C9]/60 max-w-2xl leading-relaxed">
                    Comandos de elite da mentoria Andressa Mallinsk. Copie e cole na <span className="text-[#D4AF37]">Estrategista Digital</span> para execução imediata.
                </p>
            </div>

            {/* Categorias */}
            <div className="flex gap-2 overflow-x-auto px-8 py-4 scrollbar-hide border-b border-[#3A0A16]/30 shrink-0">
                {promptCategories.map((cat, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${activeCategory === cat.name
                                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 border border-transparent'
                                : 'bg-[#2A262D] text-[#CBC8C9]/60 border border-[#3A0A16] hover:border-[#D4AF37]/30'
                            }`}
                    >
                        <cat.icon className="w-4 h-4" />
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Prompts Cards */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 pb-20 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                    {currentPrompts.map((p) => (
                        <div
                            key={p.id}
                            className="bg-[#2A262D] border border-[#3A0A16] rounded-2xl p-6 hover:border-[#D4AF37]/30 transition-all group flex flex-col justify-between shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#D4AF37]/10 transition-all"></div>

                            <div className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-[#D4AF37]/10 rounded-lg group-hover:bg-[#D4AF37]/20 transition-all">
                                        <Terminal className="w-4 h-4 text-[#D4AF37]" />
                                    </div>
                                    <h3 className="font-bold text-white text-lg tracking-tight">{p.title}</h3>
                                </div>
                                <p className="text-sm text-[#CBC8C9]/70 mb-6 leading-relaxed">
                                    {p.description}
                                </p>
                            </div>

                            <button
                                onClick={() => handleCopy(p.id, p.command)}
                                className={`relative flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold tracking-wide uppercase text-xs ${copiedId === p.id
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                        : 'bg-[#53050B] text-white hover:bg-[#7a0710] border border-[#7a0710]/50 shadow-lg'
                                    }`}
                            >
                                {copiedId === p.id ? (
                                    <><Check className="w-4 h-4" /> Comandei!</>
                                ) : (
                                    <><Copy className="w-4 h-4" /> Copiar Comando</>
                                )}
                            </button>
                        </div>
                    ))}

                    <div className="col-span-1 md:col-span-2 mt-8 text-center">
                        <p className="text-[10px] text-[#CBC8C9]/20 uppercase tracking-[0.3em]">Exclusivo para Mentoradas Andressa Mallinsk</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
