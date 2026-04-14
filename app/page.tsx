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

  const [filtroResp, setFiltroResp] = useState('Todos')
  const [somentePendentes, setSomentePendentes] = useState(false)
  const [usuarioLogado, setUsuarioLogado] = useState('Todos')

  const [logado, setLogado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')

  const responsaveis = ['Benedito', 'Clarice', 'João Pedro']

  // 🔐 LOGIN PERSISTENTE
  useEffect(() => {
    const acesso = localStorage.getItem('logado')
    if (acesso === 'true') setLogado(true)
  }, [])

  function login() {
    if (senhaInput === 'Tetr@2025') {
      setLogado(true)
      localStorage.setItem('logado', 'true')
    } else {
      alert('Senha incorreta')
    }
  }

  function logout() {
    localStorage.removeItem('logado')
    setLogado(false)
  }

  useEffect(() => {
    carregarControles()
  }, [mes, ano])

  async function carregarControles() {
    try {
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
          id, cliente_id, financeiro, fiscal, folha, conciliado,
          clientes (nome, responsavel)
        `)
        .eq('mes', mes)
        .eq('ano', ano)

      if (!data) return

      setControles(
        data.map((item: any) => ({
          id: item.id,
          cliente_id: item.cliente_id,
          nome: item.clientes.nome,
          responsavel: item.clientes.responsavel,
          financeiro: item.financeiro,
          fiscal: item.fiscal,
          folha: item.folha,
          conciliado: item.conciliado
        }))
      )
    } catch {
      alert('Erro ao carregar dados')
    }
  }

  async function atualizarCampo(id: string, campo: string, valor: boolean) {
    await supabase.from('controles_mensais').update({ [campo]: valor }).eq('id', id)
    carregarControles()
  }

  async function alterarResponsavel(cliente_id: string, novoResponsavel: string) {
    await supabase.from('clientes').update({ responsavel: novoResponsavel }).eq('id', cliente_id)
    carregarControles()
  }

  // 🔍 FILTROS
  const controlesFiltrados = controles.filter((c) => {
    const fechado = c.financeiro && c.fiscal && c.folha && c.conciliado

    if (filtroResp !== 'Todos' && c.responsavel !== filtroResp) return false
    if (usuarioLogado !== 'Todos' && c.responsavel !== usuarioLogado) return false
    if (somentePendentes && fechado) return false

    return true
  })

  const total = controles.length
  const fechados = controles.filter(c => c.financeiro && c.fiscal && c.folha && c.conciliado).length
  const pendentes = total - fechados
  const perc = total ? Math.round((fechados / total) * 100) : 0

  // 🔐 TELA LOGIN
  if (!logado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <h2 className="mb-4 text-xl">Acesso</h2>
          <input
            type="password"
            placeholder="Senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="border p-2 rounded mb-4 w-full"
          />
          <button onClick={login} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <div className="bg-white shadow px-4 md:px-10 py-4 flex justify-between items-center">
        <h1 className="font-bold text-lg md:text-2xl">RESULTS CONTADORES</h1>

        <div className="flex gap-2 items-center">
          <select value={usuarioLogado} onChange={(e)=>setUsuarioLogado(e.target.value)} className="border p-1 rounded">
            <option>Todos</option>
            {responsaveis.map(r=><option key={r}>{r}</option>)}
          </select>

          <select value={mes} onChange={(e)=>setMes(Number(e.target.value))} className="border p-1 rounded">
            {[...Array(12)].map((_,i)=>(
              <option key={i+1} value={i+1}>Mês {i+1}</option>
            ))}
          </select>

          <input value={ano} onChange={(e)=>setAno(Number(e.target.value))} className="border p-1 rounded w-20"/>

          <button onClick={logout} className="text-red-500 text-sm">Sair</button>
        </div>
      </div>

      <div className="p-4 md:p-10 max-w-7xl mx-auto">

        {/* CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card title="Total" value={total} />
          <Card title="Fechados" value={fechados} color="green" />
          <Card title="Pendentes" value={pendentes} color="red" />
        </div>

        {/* PROGRESSO */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <div className="flex justify-between mb-2">
            <span>Progresso Geral</span>
            <span>{perc}%</span>
          </div>
          <div className="w-full bg-gray-200 h-3 rounded">
            <div className="bg-green-500 h-3 rounded" style={{width:`${perc}%`}}/>
          </div>
        </div>

        {/* DASHBOARD POR RESPONSÁVEL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {responsaveis.map(resp=>{
            const lista = controles.filter(c=>c.responsavel===resp)
            const total = lista.length
            const fech = lista.filter(c=>c.financeiro&&c.fiscal&&c.folha&&c.conciliado).length
            const p = total ? Math.round((fech/total)*100):0

            return (
              <div key={resp} className="bg-white p-4 rounded-xl shadow">
                <div className="flex justify-between mb-2">
                  <span>{resp}</span>
                  <span>{p}%</span>
                </div>
                <div className="w-full bg-gray-200 h-3 rounded">
                  <div className="bg-blue-500 h-3 rounded" style={{width:`${p}%`}}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th>Resp</th>
                <th>Fin</th>
                <th>Fis</th>
                <th>Fol</th>
                <th>Conc</th>
                <th>%</th>
              </tr>
            </thead>

            <tbody>
              {controlesFiltrados.map(c=>{
                const t = Number(c.financeiro)+Number(c.fiscal)+Number(c.folha)+Number(c.conciliado)
                const p = Math.round((t/4)*100)

                return (
                  <tr key={c.id} className="border-t text-center hover:bg-gray-50">
                    <td className="text-left p-3">{c.nome}</td>

                    <td>
                      <select value={c.responsavel} onChange={(e)=>alterarResponsavel(c.cliente_id,e.target.value)} className="border p-1 rounded">
                        {responsaveis.map(r=><option key={r}>{r}</option>)}
                      </select>
                    </td>

                    {['financeiro','fiscal','folha','conciliado'].map(campo=>(
                      <td key={campo}>
                        <input type="checkbox" checked={(c as any)[campo]} onChange={(e)=>atualizarCampo(c.id,campo,e.target.checked)}/>
                      </td>
                    ))}

                    <td>{p}%</td>
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

function Card({title,value,color}:{title:string,value:number,color?:string}){
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-bold ${
        color==='green'?'text-green-600':
        color==='red'?'text-red-600':''
      }`}>
        {value}
      </div>
    </div>
  )
}
