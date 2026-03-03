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
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('Benedito')
  const [filtroResp, setFiltroResp] = useState('Todos')
  const [somentePendentes, setSomentePendentes] = useState(false)

  useEffect(() => {
    carregarControles()
  }, [mes, ano])

  async function carregarControles() {
    const { data: clientes } = await supabase
      .from('clientes')
      .select('*')

    if (!clientes) return

    for (const cliente of clientes) {
      const { data: existente } = await supabase
        .from('controles_mensais')
        .select('*')
        .eq('cliente_id', cliente.id)
        .eq('mes', mes)
        .eq('ano', ano)
        .single()

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
  }

  async function atualizarCampo(id: string, campo: string, valor: boolean) {
    await supabase
      .from('controles_mensais')
      .update({ [campo]: valor })
      .eq('id', id)

    carregarControles()
  }

  async function adicionarCliente() {
    if (!nome) return alert('Digite o nome do cliente')

    await supabase.from('clientes').insert([
      { nome, responsavel }
    ])

    setNome('')
    carregarControles()
  }

  async function excluirCliente(cliente_id: string) {
    if (!confirm('Deseja realmente excluir este cliente?')) return

    await supabase
      .from('clientes')
      .delete()
      .eq('id', cliente_id)

    carregarControles()
  }

  // ✅ NOVA FUNÇÃO (SEM REMOVER NADA)
  async function alterarResponsavel(cliente_id: string, novoResponsavel: string) {
    await supabase
      .from('clientes')
      .update({ responsavel: novoResponsavel })
      .eq('id', cliente_id)

    carregarControles()
  }

  const controlesFiltrados = controles.filter((c) => {
    const fechado =
      c.financeiro &&
      c.fiscal &&
      c.folha &&
      c.conciliado

    if (filtroResp !== 'Todos' && c.responsavel !== filtroResp)
      return false

    if (somentePendentes && fechado)
      return false

    return true
  })

  const totalClientes = controles.length
  const fechados = controles.filter(c =>
    c.financeiro && c.fiscal && c.folha && c.conciliado
  ).length
  const pendentes = totalClientes - fechados
  const percentualGeral = totalClientes
    ? Math.round((fechados / totalClientes) * 100)
    : 0

  const responsaveis = ['Benedito', 'Clarice', 'João Pedro']

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-3xl font-bold text-center text-gray-800">
          RESULTS CONTADORES ASSOCIADOS LTDA
        </h1>
        <h2 className="text-lg text-center text-gray-500 mb-8">
          CONTROLE DE FECHAMENTO CONTÁBIL
        </h2>

        {/* Painel Resumo */}
        <div className="bg-white shadow-md rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4">
            📊 Resumo do Mês {mes}/{ano}
          </h3>

          <div className="flex justify-between mb-4 text-sm">
            <span>Total: {totalClientes}</span>
            <span className="text-green-600">Fechados: {fechados}</span>
            <span className="text-red-600">Pendentes: {pendentes}</span>
            <span className="font-bold">{percentualGeral}%</span>
          </div>

          <div className="w-full bg-gray-200 h-3 rounded-full">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${percentualGeral}%` }}
            />
          </div>
        </div>

        {/* Dashboard Responsáveis */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {responsaveis.map((resp) => {
            const lista = controles.filter(c => c.responsavel === resp)
            const total = lista.length
            const fech = lista.filter(c =>
              c.financeiro && c.fiscal && c.folha && c.conciliado
            ).length
            const perc = total ? Math.round((fech / total) * 100) : 0

            return (
              <div key={resp} className="bg-white shadow-md rounded-xl p-5">
                <h4 className="font-semibold mb-3">{resp}</h4>
                <div className="text-sm mb-2">{perc}% concluído</div>
                <div className="w-full bg-gray-200 h-2 rounded-full">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${perc}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Cadastro */}
        <div className="bg-white shadow-md rounded-xl p-6 mb-8 flex justify-center space-x-3">
          <input
            type="text"
            placeholder="Nome do cliente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border rounded-lg p-2 w-64"
          />
          <select
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className="border rounded-lg p-2"
          >
            {responsaveis.map(r => <option key={r}>{r}</option>)}
          </select>
          <button
            onClick={adicionarCliente}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Adicionar
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white shadow-md rounded-xl p-6 mb-8 flex justify-center space-x-4 items-center">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="border rounded-lg p-2"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Mês {i + 1}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="border rounded-lg p-2 w-24"
          />

          <select
            value={filtroResp}
            onChange={(e) => setFiltroResp(e.target.value)}
            className="border rounded-lg p-2"
          >
            <option>Todos</option>
            {responsaveis.map(r => <option key={r}>{r}</option>)}
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={somentePendentes}
              onChange={(e) => setSomentePendentes(e.target.checked)}
            />
            <span>Somente Pendentes</span>
          </label>
        </div>

        {/* Tabela */}
        <div className="bg-white shadow-md rounded-xl p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-center">
                <th className="text-left pb-2">Cliente</th>
                <th>Resp</th>
                <th>Fin</th>
                <th>Fis</th>
                <th>Fol</th>
                <th>Conc</th>
                <th>%</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {controlesFiltrados.map((c) => {
                const total =
                  Number(c.financeiro) +
                  Number(c.fiscal) +
                  Number(c.folha) +
                  Number(c.conciliado)

                const percentual = Math.round((total / 4) * 100)
                const fechado = percentual === 100

                return (
                  <tr key={c.id} className="border-b text-center">
                    <td className="py-3 text-left">{c.nome}</td>

                    <td>
                      <select
                        value={c.responsavel}
                        onChange={(e) =>
                          alterarResponsavel(c.cliente_id, e.target.value)
                        }
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {responsaveis.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>

                    {['financeiro','fiscal','folha','conciliado'].map((campo) => (
                      <td key={campo}>
                        <input
                          type="checkbox"
                          checked={(c as any)[campo]}
                          onChange={(e) =>
                            atualizarCampo(c.id, campo, e.target.checked)
                          }
                        />
                      </td>
                    ))}

                    <td className="font-semibold">{percentual}%</td>

                    <td>
                      {fechado ? (
                        <span className="text-green-600 font-semibold">
                          FECHADO
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">
                          PENDENTE
                        </span>
                      )}
                    </td>

                    <td>
                      <button
                        onClick={() => excluirCliente(c.cliente_id)}
                        className="text-red-500 text-xs"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}