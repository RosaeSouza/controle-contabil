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
  { key: 'financeiro', label: 'Fin' },
  { key: 'fiscal',     label: 'Fis' },
  { key: 'folha',      label: 'Fol' },
  { key: 'conciliado', label: 'Conc' },
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
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <h1 className="text-white font-bold text-xl tracking-wide">RESULTS CONTADORES</h1>
          <p className="text-slate-400 text-sm mt-1">Controle de Fechamento Mensal</p>
        </div>

        {/* Card */}
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
          {erro && (
            <p className="text-red-400 text-xs mt-2">Senha incorreta. Tente novamente.</p>
          )}
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
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [logado, setLogado]               = useState(false)
  const [controles, setControles]         = useState<Controle[]>([])
  const [loading, setLoading]             = useState(false)
  const [erro, setErro]                   = useState<string | null>(null)
  const [mes, setMes]                     = useState(new Date().getMonth() + 1)
  const [ano, setAno]                     = useState(new Date().getFullYear())
  const [filtroResp, setFiltroResp]       = useState('Todos')
  const [somentePendentes, setSomentePendentes] = useState(false)
  const [novoNome, setNovoNome]           = useState('')
  const [novoResp, setNovoResp]           = useState('Benedito')
  const [adicionando, setAdicionando]     = useState(false)

  // Verifica login salvo
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
      // 1. Busca todos os clientes
      const { data: clientes, error: errClientes } = await supabase
        .from('clientes')
        .select('*')

      if (errClientes) throw errClientes

      const clientesLista = clientes || []

      // 2. Busca todos os controles do mês/ano em UMA só query
      const { data: existentes, error: errExistentes } = await supabase
        .from('controles_mensais')
        .select('cliente_id')
        .eq('mes', mes)
        .eq('ano', ano)

      if (errExistentes) throw errExistentes

      // 3. Identifica quais clientes NÃO têm registro e insere em bulk
      const idsExistentes = new Set((existentes || []).map((r: any) => r.cliente_id))
      const paraInserir = clientesLista
        .filter(c => !idsExistentes.has(c.id))
        .map(c => ({ cliente_id: c.id, mes, ano }))

      if (paraInserir.length > 0) {
        const { error: errInsert } = await supabase
          .from('controles_mensais')
          .insert(paraInserir)
        if (errInsert) throw errInsert
      }

      // 4. Busca todos os controles com dados dos clientes (1 query)
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

  // ── Atualizar checkbox ──────────────────────────────────────────────────────
  async function atualizar(id: string, campo: string, valor: boolean) {
    // Otimistic update para feedback imediato
    setControles(prev =>
      prev.map(c => c.id === id ? { ...c, [campo]: valor } : c)
    )
    const { error } = await supabase
      .from('controles_mensais')
      .update({ [campo]: valor })
      .eq('id', id)

    if (error) {
      // Reverte se falhar
      setControles(prev =>
        prev.map(c => c.id === id ? { ...c, [campo]: !valor } : c)
      )
      alert('Erro ao salvar. Tente novamente.')
    }
  }

  // ── Adicionar cliente ───────────────────────────────────────────────────────
  async function addCliente() {
    if (!novoNome.trim()) return
    setAdicionando(true)
    try {
      const { error } = await supabase
        .from('clientes')
        .insert([{ nome: novoNome.trim(), responsavel: novoResp }])
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
    setControles(prev =>
      prev.map(c => c.cliente_id === cliente_id ? { ...c, responsavel: r } : c)
    )
    await supabase.from('clientes').update({ responsavel: r }).eq('id', cliente_id)
  }

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const ehFechado = (c: Controle) => c.financeiro && c.fiscal && c.folha && c.conciliado

  const statsGerais: Stats = {
    total:    controles.length,
    fechados: controles.filter(ehFechado).length,
    perc:     controles.length ? Math.round((controles.filter(ehFechado).length / controles.length) * 100) : 0,
  }

  const statsPorResp = RESPONSAVEIS.map(r => {
    const grupo = controles.filter(c => c.responsavel === r)
    const fechados = grupo.filter(ehFechado).length
    return {
      nome:     r,
      total:    grupo.length,
      fechados,
      perc:     grupo.length ? Math.round((fechados / grupo.length) * 100) : 0,
    }
  })

  const filtrados = controles.filter(c => {
    if (filtroResp !== 'Todos' && c.responsavel !== filtroResp) return false
    if (somentePendentes && ehFechado(c)) return false
    return true
  })

  // ── Status visual do progresso ──────────────────────────────────────────────
  const percColor =
    statsGerais.perc === 100 ? 'bg-emerald-500' :
    statsGerais.perc >= 80   ? 'bg-blue-500'    :
    statsGerais.perc >= 50   ? 'bg-amber-500'   :
                               'bg-red-500'

  const percMsg =
    statsGerais.perc === 100 ? '🎉 Todos os balancetes fechados!' :
    statsGerais.perc >= 80   ? `⚡ Quase lá — faltam ${statsGerais.total - statsGerais.fechados} empresa(s)` :
    statsGerais.perc >= 50   ? `📋 Metade concluída — ${statsGerais.total - statsGerais.fechados} pendente(s)` :
                               `🚨 ${statsGerais.total - statsGerais.fechados} empresa(s) pendentes`

  // ── Telas ───────────────────────────────────────────────────────────────────

  if (!logado) {
    return <LoginScreen onLogin={() => setLogado(true)} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Logo + Título */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow shadow-blue-600/30">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-none">Results Contadores</h1>
              <p className="text-xs text-slate-400">Controle de Fechamento</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mês */}
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>

            {/* Ano */}
            <input
              type="number"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white w-20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />

            {/* Responsável */}
            <select
              value={filtroResp}
              onChange={e => setFiltroResp(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              <option value="Todos">Todos</option>
              {RESPONSAVEIS.map(r => <option key={r}>{r}</option>)}
            </select>

            {/* Somente pendentes */}
            <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={somentePendentes}
                onChange={e => setSomentePendentes(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Pendentes
            </label>

            {/* Botão sair */}
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

        {/* ── CARDS DE STATS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total de Empresas" value={statsGerais.total}    accent="border-slate-400" />
          <StatCard label="Balancetes Fechados" value={statsGerais.fechados} accent="border-emerald-500"
            sub={`${statsGerais.perc}% concluído`} />
          <StatCard label="Pendentes"          value={statsGerais.total - statsGerais.fechados} accent="border-red-400" />
          <StatCard label="Mês de Referência"
            value={MESES[mes - 1]}
            sub={String(ano)}
            accent="border-blue-500"
          />
        </div>

        {/* ── PROGRESSO GERAL + POR RESPONSÁVEL ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Progresso geral */}
          <div className="md:col-span-1 bg-white rounded-2xl shadow-sm p-5">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Progresso Geral</span>
              <span className="text-2xl font-bold text-slate-800">{statsGerais.perc}%</span>
            </div>
            <ProgressBar value={statsGerais.perc} color={percColor} />
            <p className="text-xs text-slate-500 mt-3">{percMsg}</p>
          </div>

          {/* Por responsável */}
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
                  <ProgressBar
                    value={s.perc}
                    color={
                      s.perc === 100 ? 'bg-emerald-500' :
                      s.perc >= 80   ? 'bg-blue-500'    :
                      s.perc >= 50   ? 'bg-amber-500'   : 'bg-red-500'
                    }
                  />
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
                    <th key={c.key} className="px-3 py-3 font-semibold text-center">{c.label}</th>
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
                    </td>
                  </tr>
                ) : (
                  filtrados.map(c => {
                    const fechado = ehFechado(c)
                    return (
                      <tr
                        key={c.id}
                        className={`border-t border-slate-100 transition-colors ${
                          fechado ? 'hover:bg-emerald-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Nome */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${fechado ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            <span className="font-medium text-slate-800">{c.nome}</span>
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
                              title={campo.label}
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
                            fechado
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {fechado ? '✓ Fechado' : '○ Pendente'}
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

          {/* Footer da tabela */}
          {!loading && filtrados.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 flex justify-between">
              <span>{filtrados.filter(ehFechado).length} fechado(s)</span>
              <span>{filtrados.filter(c => !ehFechado(c)).length} pendente(s)</span>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
