'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function Home() {
  const [controles, setControles] = useState<Controle[]>([])
  const [loading, setLoading] = useState(true)

  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('Benedito')

  const [filtroResp, setFiltroResp] = useState('Todos')
  const [somentePendentes, setSomentePendentes] = useState(false)

  const [logado, setLogado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')

  function login() {
    if (senhaInput === 'Tetr@2025') {
      setLogado(true)
    } else {
      alert('Senha incorreta')
    }
  }

  useEffect(() => {
    carregarControles()
  }, [mes, ano])

  async function carregarControles() {
    try {
      setLoading(true)

      const { data: clientes } = await supabase.from('clientes').select('*')

      if (!clientes) return

      for (const cliente of clientes) {
        const { data: existente } = await supabase
          .from('controles_mensais')
          .select('*')
          .eq('cliente_id', cliente.id)
          .eq('mes', mes)
          .eq('ano', ano)
          .maybeSingle()

        if (!existente) {
          await supabase.from('controles_mensais').insert([
            { cliente_id: cliente.id, mes, ano }
          ])
        }
      }

      const { data } = await supabase
        .from('controles_mensais')
        .select(`
          id,
          cliente_id,
          financeiro,
          fiscal,
          folha,
          conciliado,
          clientes (
            nome,
            responsavel
          )
        `)
        .eq('mes', mes)
        .eq('ano', ano)

      if (!data) return

      const formatado = data.map((item: any) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        nome: item.clientes.nome,
        responsavel: item.clientes.responsavel,
        financeiro: item.financeiro,
        fiscal: item.fiscal,
        folha: item.folha,
        conciliado: item.conciliado
      }))

      setControles(formatado)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      alert('Erro ao carregar sistema. Atualize a página.')
    } finally {
      setLoading(false)
    }
  }

  async function atualizarCampo(id: string, campo: string, valor: boolean) {
    await supabase
      .from('controles_mensais')
      .update({ [campo]: valor })
      .eq('id', id)

    carregarControles()
  }

  async function alterarResponsavel(cliente_id: string, novoResponsavel: string) {
    await supabase
      .from('clientes')
      .update({ responsavel: novoResponsavel })
      .eq('id', cliente_id)

    carregarControles()
  }

  const responsaveis = ['Benedito', 'Clarice', 'João Pedro']

  if (!logado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm text-center">
          <h2 className="text-xl font-semibold mb-4">Acesso</h2>

          <input
            type="password"
            placeholder="Senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="border rounded p-2 w-full mb-4"
          />

          <button onClick={login} className="bg-blue-600 text-white w-full p-2 rounded">
            Entrar
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando sistema...</p>
      </div>
    )
  }

  const controlesFiltrados = controles.filter((c) => {
    const fechado = c.financeiro && c.fiscal && c.folha && c.conciliado

    if (filtroResp !== 'Todos' && c.responsavel !== filtroResp) return false
    if (somentePendentes && fechado) return false

    return true
  })

  return (
    <div className="p-4 md:p-10">
      <h1 className="text-xl md:text-3xl font-bold text-center mb-4">
        RESULTS CONTADORES
      </h1>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="border p-2 rounded">
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>Mês {i + 1}</option>
          ))}
        </select>

        <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} className="border p-2 rounded w-24" />

        <select value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)} className="border p-2 rounded">
          <option>Todos</option>
          {responsaveis.map(r => <option key={r}>{r}</option>)}
        </select>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={somentePendentes} onChange={(e) => setSomentePendentes(e.target.checked)} />
          Pendentes
        </label>
      </div>

      {/* Tabela responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Resp</th>
              <th>Fin</th>
              <th>Fis</th>
              <th>Fol</th>
              <th>Conc</th>
            </tr>
          </thead>

          <tbody>
            {controlesFiltrados.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>

                <td>
                  <select value={c.responsavel} onChange={(e) => alterarResponsavel(c.cliente_id, e.target.value)}>
                    {responsaveis.map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>

                {['financeiro','fiscal','folha','conciliado'].map((campo) => (
                  <td key={campo}>
                    <input
                      type="checkbox"
                      checked={(c as any)[campo]}
                      onChange={(e) => atualizarCampo(c.id, campo, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
