import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const promptCategories = [
  { name: "🔍 Diagnóstico", prompts: [
    { id: 1, title: "Diagnóstico Completo", description: "Gere um diagnóstico estratégico real do seu momento.", command: "Meu nome é ______. Vou responder suas perguntas sobre meu negócio e quero que você gere um diagnóstico estratégico real do meu momento. Com base nas minhas respostas: - Classifique o estágio do meu negócio - Identifique o gargalo dominante - Mostre onde o dinheiro está travado - Defina prioridade única - Gere um plano de 7 dias. Seja direta, estratégica e sem respostas genéricas." },
    { id: 2, title: "Diagnóstico Rápido de Gargalo", description: "Descubra onde você está perdendo dinheiro agora.", command: "Essa é a realidade atual do meu negócio: ______. Sem rodeios, me diga: - Onde está meu principal gargalo? - O que está me fazendo perder dinheiro? - O que eu preciso parar de fazer imediatamente? - Qual deve ser meu foco único nos próximos 15 dias?" },
  ]},
  { name: "👁️ Perfil IG", prompts: [
    { id: 3, title: "Análise de Perfil Estratégico", description: "Diagnóstico completo do seu Instagram.", command: "Analise meu perfil do Instagram com olhar estratégico: [cole aqui o link ou descreva seu perfil]. Quero saber: - O que está funcionando - O que está repelindo clientes - Como melhorar minha bio - Que tipo de conteúdo devo priorizar - Como aumentar minha conversão pelo perfil" },
  ]},
  { name: "🎯 Estrategista", prompts: [
    { id: 4, title: "Plano 30 Dias", description: "Plano mensal, semanal e diário estratégico.", command: "Com base no meu negócio [descreva], crie um plano estratégico de 30 dias com: - Meta principal do mês - 4 objetivos semanais - Ações diárias prioritárias - Métricas de acompanhamento - O que eliminar do meu dia" },
    { id: 5, title: "Ajuste de Estratégia", description: "Correção de rota no meio do ciclo.", command: "Estou no meio do mês e meus resultados são: [descreva]. O que planejei foi: [descreva]. O que está funcionando: [descreva]. O que não está: [descreva]. Me dê um ajuste de rota para recuperar o mês." },
  ]},
  { name: "📊 Funis", prompts: [
    { id: 6, title: "Construtor de Funil", description: "Monte seu funil de vendas completo.", command: "Meu produto/serviço é: [descreva]. Meu cliente ideal é: [descreva]. Meu ticket médio é: R$ ______. Monte um funil de vendas completo com: topo, meio, fundo e fechamento. Inclua os gatilhos certos para cada etapa." },
  ]},
  { name: "💰 Vendas", prompts: [
    { id: 7, title: "Script de Vendas no DM", description: "Feche mais vendas pelo direct.", command: "Meu produto é [descreva] e custa R$ ______. Crie um script de vendas para DM do Instagram que: - Qualifique o lead - Apresente o valor - Contorne objeções comuns - Feche com urgência real" },
  ]},
  { name: "📈 Métricas", prompts: [
    { id: 8, title: "Raio-X Financeiro", description: "Entenda seus números de verdade.", command: "Meu faturamento bruto mensal é R$ ______. Meus custos fixos são R$ ______. Meus custos variáveis são R$ ______. Meu lucro líquido é R$ ______. Analise minha saúde financeira e me diga o que preciso mudar para ter mais margem." },
  ]},
  { name: "⚓ Processos", prompts: [
    { id: 9, title: "Automatizar e Delegar", description: "Pare de fazer tudo sozinha.", command: "Essas são as tarefas que faço no meu negócio: [liste]. Me diga: - O que devo eliminar - O que devo automatizar - O que devo delegar - O que só eu posso fazer - Como criar um processo para cada área" },
  ]},
  { name: "📣 Autoridade", prompts: [
    { id: 10, title: "Posicionamento de Autoridade", description: "Seja reconhecida como referência.", command: "Meu nicho é [descreva]. Minha transformação principal é [descreva]. Meus diferenciais são [descreva]. Crie uma estratégia de posicionamento de autoridade para eu ser reconhecida como referência no meu mercado nos próximos 60 dias." },
  ]},
  { name: "🎯 Foco Único", prompts: [
    { id: 11, title: "Uma Coisa Só", description: "Qual é o seu foco único agora?", command: "Minha situação atual é: [descreva]. Minha meta é: [descreva]. Meu maior problema é: [descreva]. Com tudo isso em mente, me diga UMA ÚNICA COISA que devo focar nos próximos 21 dias para ter resultado real." },
  ]},
];

export default function PromptLibrary() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const cat = promptCategories[activeCategory];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #1A0505' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#E0E0E0', margin: 0 }}>Biblioteca de Prompts</h1>
        <p style={{ color: '#555', fontSize: '13px', marginTop: '4px' }}>Comandos de elite da metodologia Andressa Mallinsk</p>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar categorias */}
        <div style={{ width: '200px', borderRight: '1px solid #1A0505', padding: '16px 8px', overflowY: 'auto', flexShrink: 0 }}>
          {promptCategories.map((cat, i) => (
            <button key={i} onClick={() => setActiveCategory(i)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px',
                border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: activeCategory === i ? '600' : '400',
                marginBottom: '2px', transition: 'all 0.15s',
                background: activeCategory === i ? 'linear-gradient(135deg, #2A0808, rgba(192,57,43,0.2))' : 'transparent',
                borderLeft: activeCategory === i ? '2px solid #C0392B' : '2px solid transparent',
                color: activeCategory === i ? '#E0E0E0' : '#666',
              }}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Prompts */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cat.prompts.map(prompt => (
              <div key={prompt.id} style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ color: '#E0E0E0', fontSize: '15px', fontWeight: '600', margin: 0 }}>{prompt.title}</h3>
                    <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>{prompt.description}</p>
                  </div>
                  <button onClick={() => copyToClipboard(prompt.command, prompt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                      background: copied === prompt.id ? '#0A2E1A' : 'linear-gradient(135deg, #7A1010, #C0392B)',
                      border: 'none', borderRadius: '8px', color: copied === prompt.id ? '#3ECF8E' : '#fff',
                      fontSize: '12px', fontWeight: '500', cursor: 'pointer', flexShrink: 0, marginLeft: '16px',
                      transition: 'all 0.2s',
                    }}>
                    {copied === prompt.id ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                  </button>
                </div>
                <div style={{ background: '#0A0A0A', border: '1px solid #1A0505', borderRadius: '8px', padding: '12px 16px', marginTop: '12px' }}>
                  <p style={{ color: '#888', fontSize: '12px', lineHeight: '1.6', margin: 0, fontFamily: 'monospace' }}>{prompt.command}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: '#333', fontSize: '11px', textAlign: 'center', marginTop: '24px' }}>Exclusivo para Mentoradas Andressa Mallinsk 🔥</p>
        </div>
      </div>
    </div>
  );
}
