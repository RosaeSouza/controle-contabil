'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Controle = {
  id: string
  cliente_id: string
  nome: string
  responsavel: string
  financeiro: boolean
  fiscal: boolean
  folha: boolean
  conciliado: boolean
}

type HistoricoRow = {
  id: string
  mes: number
  ano: number
  financeiro: boolean
  fiscal: boolean
  folha: boolean
  conciliado: boolean
}

type Stats = {
  total: number
  fechados: number
  perc: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RESPONSAVEIS = ['Benedito', 'Clarice', 'João Pedro']

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const CAMPOS = [
  { key: 'financeiro', label: 'Fin',  full: 'Financeiro' },
  { key: 'fiscal',     label: 'Fis',  full: 'Fiscal'     },
  { key: 'folha',      label: 'Fol',  full: 'Folha'      },
  { key: 'conciliado', label: 'Conc', full: 'Conciliado' },
] as const

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleLogin() {
    setLoading(true)
    setErro(false)
    setTimeout(() => {
      if (senha === 'Tetr@2025') {
        localStorage.setItem('logado', 'true')
        onLogin()
      } else {
        setErro(true)
      }
      setLoading(false)
    }, 300)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <h1 className="text-white font-bold text-xl tracking-wide">RESULTS CONTADORES</h1>
          <p className="text-slate-400 text-sm mt-1">Controle de Fechamento Mensal</p>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <label className="block text-slate-300 text-sm mb-2 font-medium">Senha de Acesso</label>
          <input
            type="password"
            value={senha}
            onChange={e => { setSenha(e.target.value); setErro(false) }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••••"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
            autoFocus
          />
          {erro && <p className="text-red-400 text-xs mt-2">Senha incorreta. Tente novamente.</p>}
          <button
            onClick={handleLogin}
            disabled={loading || !senha}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-white transition-all bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      <td className="p-3"><div className="h-4 bg-slate-200 rounded w-40" /></td>
      <td className="p-3"><div className="h-4 bg-slate-200 rounded w-20 mx-auto" /></td>
      {[0,1,2,3].map(i => (
        <td key={i} className="p-3 text-center"><div className="h-5 w-5 bg-slate-200 rounded mx-auto" /></td>
      ))}
      <td className="p-3"><div className="h-5 bg-slate-200 rounded w-20 mx-auto" /></td>
      <td className="p-3"><div className="h-5 bg-slate-200 rounded w-12 mx-auto" /></td>
    </tr>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border-l-4 p-5 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
    </div>
  )
}

// ─── Check Badge (histórico) ───────────────────────────────────────────────────

function CheckBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
    }`}>
      {ok ? '✓' : '○'} {label}
    </span>
  )
}

// ─── Modal Histórico da Empresa ───────────────────────────────────────────────

function ModalHistorico({
  empresa,
  onClose,
}: {
  empresa: { id: string; nome: string; responsavel: string }
  onClose: () => void
}) {
  const [historico, setHistorico] = useState<HistoricoRow[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const { data } = await supabase
        .from('controles_mensais')
        .select('id, mes, ano, financeiro, fiscal, folha, conciliado')
        .eq('cliente_id', empresa.id)
        .order('ano',  { ascending: false })
        .order('mes',  { ascending: false })
      setHistorico(data || [])
      setLoading(false)
    }
    carregar()
  }, [empresa.id])

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  const totalMeses  = historico.length
  const mesesFeitos = historico.filter(h => h.financeiro && h.fiscal && h.folha && h.conciliado).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header do modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{empresa.nome}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Responsável: <span className="text-slate-600 font-medium">{empresa.responsavel}</span>
              {totalMeses > 0 && (
                <span className="ml-3">· {mesesFeitos}/{totalMeses} meses fechados</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors text-2xl leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              <p>Nenhum registro encontrado para esta empresa.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historico.map(h => {
                const fechado  = h.financeiro && h.fiscal && h.folha && h.conciliado
                const semNada  = !h.financeiro && !h.fiscal && !h.folha && !h.conciliado
                return (
                  <div
                    key={h.id}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
                      fechado  ? 'bg-emerald-50  border-emerald-200' :
                      semNada  ? 'bg-amber-50    border-amber-200'   :
                                 'bg-white       border-slate-200'
                    }`}
                  >
                    {/* Mês/Ano */}
                    <div className="w-28 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-700">{MESES[h.mes - 1]}</p>
                      <p className="text-xs text-slate-400">{h.ano}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {CAMPOS.map(c => (
                        <CheckBadge key={c.key} ok={(h as any)[c.key]} label={c.full} />
                      ))}
                    </div>

                    {/* Status geral */}
                    <div className="flex-shrink-0">
                      {fechado ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">✓ Fechado</span>
                      ) : semNada ? (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">⏰ Sem atividade</span>
                      ) : (
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">◑ Parcial</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [logado, setLogado]                     = useState(false)
  const [controles, setControles]               = useState<Controle[]>([])
  const [loading, setLoading]                   = useState(false)
  const [erro, setErro]                         = useState<string | null>(null)
  const [mes, setMes]                           = useState(new Date().getMonth() + 1)
  const [ano, setAno]                           = useState(new Date().getFullYear())
  const [filtroResp, setFiltroResp]             = useState('Todos')
  const [somentePendentes, setSomentePendentes] = useState(false)
  const [buscaEmpresa, setBuscaEmpresa]         = useState('')
  const [empresaModal, setEmpresaModal]         = useState<{ id: string; nome: string; responsavel: string } | null>(null)
  const [novoNome, setNovoNome]                 = useState('')
  const [novoResp, setNovoResp]                 = useState('Benedito')
  const [adicionando, setAdicionando]           = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('logado') === 'true') {
      setLogado(true)
    }
  }, [])

  // ── Carregar dados (sem N+1) ────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data: clientes, error: errClientes } = await supabase
        .from('clientes').select('*')
      if (errClientes) throw errClientes

      const clientesLista = clientes || []

      const { data: existentes, error: errExistentes } = await supabase
        .from('controles_mensais')
        .select('cliente_id')
        .eq('mes', mes)
        .eq('ano', ano)
      if (errExistentes) throw errExistentes

      const idsExistentes = new Set((existentes || []).map((r: any) => r.cliente_id))
      const paraInserir = clientesLista
        .filter(c => !idsExistentes.has(c.id))
        .map(c => ({ cliente_id: c.id, mes, ano }))

      if (paraInserir.length > 0) {
        const { error: errInsert } = await supabase
          .from('controles_mensais').insert(paraInserir)
        if (errInsert) throw errInsert
      }

      const { data, error: errData } = await supabase
        .from('controles_mensais')
        .select('*, clientes(nome, responsavel)')
        .eq('mes', mes)
        .eq('ano', ano)
      if (errData) throw errData

      const lista: Controle[] = (data || []).map((i: any) => ({
        id:          i.id,
        cliente_id:  i.cliente_id,
        nome:        i.clientes?.nome ?? '(sem nome)',
        responsavel: i.clientes?.responsavel ?? '-',
        financeiro:  i.financeiro  ?? false,
        fiscal:      i.fiscal      ?? false,
        folha:       i.folha       ?? false,
        conciliado:  i.conciliado  ?? false,
      }))

      lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      setControles(lista)
    } catch (e: any) {
      console.error(e)
      setErro('Erro ao carregar dados. Verifique a conexão com o banco.')
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => {
    if (logado) carregar()
  }, [logado, carregar])

  // ── Atualizar checkbox (optimistic) ────────────────────────────────────────
  async function atualizar(id: string, campo: string, valor: boolean) {
    setControles(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c))
    const { error } = await supabase
      .from('controles_mensais').update({ [campo]: valor }).eq('id', id)
    if (error) {
      setControles(prev => prev.map(c => c.id === id ? { ...c, [campo]: !valor } : c))
      alert('Erro ao salvar. Tente novamente.')
    }
  }

  // ── Adicionar cliente ───────────────────────────────────────────────────────
  async function addCliente() {
    if (!novoNome.trim()) return
    setAdicionando(true)
    try {
      const { error } = await supabase
        .from('clientes').insert([{ nome: novoNome.trim(), responsavel: novoResp }])
      if (error) throw error
      setNovoNome('')
      await carregar()
    } catch {
      alert('Erro ao adicionar cliente.')
    } finally {
      setAdicionando(false)
    }
  }

  // ── Excluir cliente ─────────────────────────────────────────────────────────
  async function excluir(cliente_id: string, nome: string) {
    if (!confirm(`Excluir o cliente "${nome}"? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', cliente_id)
    if (error) { alert('Erro ao excluir.'); return }
    await carregar()
  }

  // ── Mudar responsável ───────────────────────────────────────────────────────
  async function mudarResp(cliente_id: string, r: string) {
    setControles(prev => prev.map(c => c.cliente_id === cliente_id ? { ...c, responsavel: r } : c))
    await supabase.from('clientes').update({ responsavel: r }).eq('id', cliente_id)
  }

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const ehFechado    = (c: Controle) =>  c.financeiro && c.fiscal && c.folha && c.conciliado
  const semAtividade = (c: Controle) => !c.financeiro && !c.fiscal && !c.folha && !c.conciliado

  const statsGerais: Stats = {
    total:    controles.length,
    fechados: controles.filter(ehFechado).length,
    perc:     controles.length ? Math.round((controles.filter(ehFechado).length / controles.length) * 100) : 0,
  }

  const statsPorResp = RESPONSAVEIS.map(r => {
    const grupo    = controles.filter(c => c.responsavel === r)
    const fechados = grupo.filter(ehFechado).length
    return {
      nome:     r,
      total:    grupo.length,
      fechados,
      perc:     grupo.length ? Math.round((fechados / grupo.length) * 100) : 0,
    }
  })

  const semAtividadeCount = controles.filter(semAtividade).length

  const filtrados = controles.filter(c => {
    if (filtroResp !== 'Todos' && c.responsavel !== filtroResp) return false
    if (somentePendentes && ehFechado(c)) return false
    if (buscaEmpresa && !c.nome.toLowerCase().includes(buscaEmpresa.toLowerCase())) return false
    return true
  })

  const percColor =
    statsGerais.perc === 100 ? 'bg-emerald-500' :
    statsGerais.perc >= 80   ? 'bg-blue-500'    :
    statsGerais.perc >= 50   ? 'bg-amber-500'   : 'bg-red-500'

  const percMsg =
    statsGerais.perc === 100 ? '🎉 Todos os balancetes fechados!' :
    statsGerais.perc >= 80   ? `⚡ Quase lá — faltam ${statsGerais.total - statsGerais.fechados} empresa(s)` :
    statsGerais.perc >= 50   ? `📋 Metade concluída — ${statsGerais.total - statsGerais.fechados} pendente(s)` :
                               `🚨 ${statsGerais.total - statsGerais.fechados} empresa(s) pendentes`

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!logado) {
    return <LoginScreen onLogin={() => setLogado(true)} />
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Modal histórico */}
      {empresaModal && (
        <ModalHistorico
          empresa={empresaModal}
          onClose={() => setEmpresaModal(null)}
        />
      )}

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow shadow-blue-600/30">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-none">Results Contadores</h1>
              <p className="text-xs text-slate-400">Controle de Fechamento</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>

            <input
              type="number"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white w-20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />

            <select
              value={filtroResp}
              onChange={e => setFiltroResp(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              <option value="Todos">Todos</option>
              {RESPONSAVEIS.map(r => <option key={r}>{r}</option>)}
            </select>

            {/* Busca por empresa */}
            <input
              type="text"
              value={buscaEmpresa}
              onChange={e => setBuscaEmpresa(e.target.value)}
              placeholder="🔍 Buscar empresa..."
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />

            <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={somentePendentes}
                onChange={e => setSomentePendentes(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Pendentes
            </label>

            <button
              onClick={() => { localStorage.removeItem('logado'); setLogado(false) }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              ⬡ Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* ── ERRO ── */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
            <span>⚠️</span> {erro}
            <button onClick={carregar} className="ml-auto underline hover:no-underline text-red-600">Tentar novamente</button>
          </div>
        )}

        {/* ── ALERTA: SEM ATIVIDADE ── */}
        {!loading && semAtividadeCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">⏰</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {semAtividadeCount} empresa{semAtividadeCount > 1 ? 's' : ''} sem nenhuma atividade em {MESES[mes - 1]}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Nenhum campo marcado. Clique no nome da empresa na tabela para ver o histórico completo.
              </p>
            </div>
            <button
              onClick={() => { setSomentePendentes(false); setFiltroResp('Todos'); setBuscaEmpresa('') }}
              className="text-xs text-amber-700 font-medium underline hover:no-underline flex-shrink-0"
            >
              Ver todas
            </button>
          </div>
        )}

        {/* ── CARDS DE STATS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total de Empresas"   value={statsGerais.total}                        accent="border-slate-400" />
          <StatCard label="Balancetes Fechados" value={statsGerais.fechados} sub={`${statsGerais.perc}% concluído`} accent="border-emerald-500" />
          <StatCard label="Pendentes"           value={statsGerais.total - statsGerais.fechados} accent="border-red-400" />
          <StatCard label="Mês de Referência"   value={MESES[mes - 1]} sub={String(ano)}         accent="border-blue-500" />
        </div>

        {/* ── PROGRESSO GERAL + POR RESPONSÁVEL ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-white rounded-2xl shadow-sm p-5">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Progresso Geral</span>
              <span className="text-2xl font-bold text-slate-800">{statsGerais.perc}%</span>
            </div>
            <ProgressBar value={statsGerais.perc} color={percColor} />
            <p className="text-xs text-slate-500 mt-3">{percMsg}</p>
            {semAtividadeCount > 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ⏰ {semAtividadeCount} empresa{semAtividadeCount > 1 ? 's' : ''} sem atividade
              </p>
            )}
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Por Responsável</p>
            <div className="space-y-4">
              {statsPorResp.map(s => (
                <div key={s.nome}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{s.nome}</span>
                    <span className="text-slate-500">
                      {s.fechados}/{s.total}
                      <span className={`ml-2 font-bold ${
                        s.perc === 100 ? 'text-emerald-600' :
                        s.perc >= 80   ? 'text-blue-600'   :
                        s.perc >= 50   ? 'text-amber-600'  : 'text-red-600'
                      }`}>{s.perc}%</span>
                    </span>
                  </div>
                  <ProgressBar value={s.perc} color={
                    s.perc === 100 ? 'bg-emerald-500' :
                    s.perc >= 80   ? 'bg-blue-500'    :
                    s.perc >= 50   ? 'bg-amber-500'   : 'bg-red-500'
                  } />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CADASTRO DE CLIENTE ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Adicionar Empresa</p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCliente()}
              placeholder="Nome da empresa"
              className="flex-1 min-w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <select
              value={novoResp}
              onChange={e => setNovoResp(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              {RESPONSAVEIS.map(r => <option key={r}>{r}</option>)}
            </select>
            <button
              onClick={addCliente}
              disabled={adicionando || !novoNome.trim()}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-blue-600/30"
            >
              {adicionando ? 'Adicionando...' : '+ Adicionar'}
            </button>
          </div>
        </div>

        {/* ── TABELA ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Empresas — {MESES[mes - 1]} {ano}
              {buscaEmpresa && <span className="ml-2 normal-case text-blue-500 font-normal">· "{buscaEmpresa}"</span>}
            </p>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {filtrados.length} empresa{filtrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="text-left px-5 py-3 font-semibold">Empresa</th>
                  <th className="px-3 py-3 font-semibold">Responsável</th>
                  {CAMPOS.map(c => (
                    <th key={c.key} className="px-3 py-3 font-semibold text-center" title={c.full}>{c.label}</th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-center">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400">
                      <div className="text-4xl mb-2">📭</div>
                      <p>Nenhuma empresa encontrada</p>
                      {buscaEmpresa && (
                        <button
                          onClick={() => setBuscaEmpresa('')}
                          className="mt-2 text-blue-500 text-sm underline hover:no-underline"
                        >
                          Limpar busca
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtrados.map(c => {
                    const fechado = ehFechado(c)
                    const semNada = semAtividade(c)
                    return (
                      <tr
                        key={c.id}
                        className={`border-t border-slate-100 transition-colors ${
                          fechado ? 'hover:bg-emerald-50/50' :
                          semNada ? 'bg-amber-50/40 hover:bg-amber-50' :
                                    'hover:bg-slate-50'
                        }`}
                      >
                        {/* Nome — clicável para histórico */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              fechado ? 'bg-emerald-500' :
                              semNada ? 'bg-amber-400'  : 'bg-red-400'
                            }`} />
                            <button
                              onClick={() => setEmpresaModal({ id: c.cliente_id, nome: c.nome, responsavel: c.responsavel })}
                              className="font-medium text-slate-800 hover:text-blue-600 hover:underline transition-colors text-left"
                              title="Clique para ver o histórico completo"
                            >
                              {c.nome}
                            </button>
                            {semNada && (
                              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0" title="Sem nenhuma atividade neste mês">
                                ⏰
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Responsável */}
                        <td className="px-3 py-3 text-center">
                          <select
                            value={c.responsavel}
                            onChange={e => mudarResp(c.cliente_id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none focus:border-blue-400"
                          >
                            {RESPONSAVEIS.map(r => <option key={r}>{r}</option>)}
                          </select>
                        </td>

                        {/* Checkboxes */}
                        {CAMPOS.map(campo => (
                          <td key={campo.key} className="px-3 py-3 text-center">
                            <button
                              onClick={() => atualizar(c.id, campo.key, !(c as any)[campo.key])}
                              title={campo.full}
                              className={`w-7 h-7 rounded-lg border-2 inline-flex items-center justify-center transition-all active:scale-90 ${
                                (c as any)[campo.key]
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                  : 'border-slate-300 text-transparent hover:border-slate-400'
                              }`}
                            >
                              ✓
                            </button>
                          </td>
                        ))}

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            fechado ? 'bg-emerald-100 text-emerald-700' :
                            semNada ? 'bg-amber-100 text-amber-700'    :
                                      'bg-red-100 text-red-700'
                          }`}>
                            {fechado ? '✓ Fechado' : semNada ? '⏰ Sem ativ.' : '○ Pendente'}
                          </span>
                        </td>

                        {/* Excluir */}
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => excluir(c.cliente_id, c.nome)}
                            className="text-slate-300 hover:text-red-500 transition-colors text-lg leading-none"
                            title="Excluir empresa"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtrados.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 flex justify-between">
              <span>{filtrados.filter(ehFechado).length} fechado(s)</span>
              <span>
                {filtrados.filter(semAtividade).length > 0 && (
                  <span className="text-amber-500 mr-3">
                    ⏰ {filtrados.filter(semAtividade).length} sem atividade
                  </span>
                )}
                {filtrados.filter(c => !ehFechado(c)).length} pendente(s)
              </span>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
