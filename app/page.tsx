'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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

  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('Benedito')

  const [logado, setLogado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')

  const responsaveis = ['Benedito', 'Clarice', 'João Pedro']

  useEffect(() => {
    if (localStorage.getItem('logado') === 'true') setLogado(true)
  }, [])

  function login() {
    if (senhaInput === 'Tetr@2025') {
      setLogado(true)
      localStorage.setItem('logado', 'true')
    }
  }

  function logout() {
    localStorage.removeItem('logado')
    setLogado(false)
  }

  useEffect(() => {
    carregar()
  }, [mes, ano])

  async function carregar() {
    const { data: clientes } = await supabase.from('clientes').select('*')

    for (const c of clientes || []) {
      const { data } = await supabase
        .from('controles_mensais')
        .select('*')
        .eq('cliente_id', c.id)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle()

      if (!data) {
        await supabase.from('controles_mensais').insert([
          { cliente_id: c.id, mes, ano }
        ])
      }
    }

    const { data } = await supabase
      .from('controles_mensais')
      .select(`*, clientes(nome,responsavel)`)
      .eq('mes', mes)
      .eq('ano', ano)

    const lista = (data || []).map((i: any) => ({
      id: i.id,
      cliente_id: i.cliente_id,
      nome: i.clientes.nome,
      responsavel: i.clientes.responsavel,
      financeiro: i.financeiro,
      fiscal: i.fiscal,
      folha: i.folha,
      conciliado: i.conciliado
    }))

    lista.sort((a, b) => a.nome.localeCompare(b.nome))

    setControles(lista)
  }

  async function atualizar(id: string, campo: string, valor: boolean) {
    await supabase.from('controles_mensais').update({ [campo]: valor }).eq('id', id)
    carregar()
  }

  async function addCliente() {
    if (!nome) return
    await supabase.from('clientes').insert([{ nome, responsavel }])
    setNome('')
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir?')) return
    await supabase.from('clientes').delete().eq('id', id)
    carregar()
  }

  async function mudarResp(id: string, r: string) {
    await supabase.from('clientes').update({ responsavel: r }).eq('id', id)
    carregar()
  }

  const filtrados = controles.filter(c => {
    const fechado = c.financeiro && c.fiscal && c.folha && c.conciliado
    if (filtroResp !== 'Todos' && c.responsavel !== filtroResp) return false
    if (somentePendentes && fechado) return false
    return true
  })

  const total = controles.length
  const fechados = controles.filter(c => c.financeiro && c.fiscal && c.folha && c.conciliado).length
  const perc = total ? Math.round((fechados / total) * 100) : 0

  if (!logado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <input
            type="password"
            placeholder="Senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="border p-2 rounded mb-4 w-full"
          />
          <button onClick={login} className="bg-blue-500 text-white px-4 py-2 rounded w-full">
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" width={42} height={42} alt="logo"/>
          <h1 className="text-2xl font-bold text-gray-800">RESULTS CONTADORES</h1>
        </div>

        <div className="flex gap-3 items-center bg-white px-4 py-2 rounded-xl shadow-sm">
          <select value={mes} onChange={e=>setMes(Number(e.target.value))}>
            {[...Array(12)].map((_,i)=><option key={i}>{i+1}</option>)}
          </select>

          <input value={ano} onChange={e=>setAno(Number(e.target.value))} className="w-20"/>

          <select value={filtroResp} onChange={e=>setFiltroResp(e.target.value)}>
            <option>Todos</option>
            {responsaveis.map(r=><option key={r}>{r}</option>)}
          </select>

          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={somentePendentes} onChange={e=>setSomentePendentes(e.target.checked)}/>
            Pendentes
          </label>

          <button onClick={logout} className="text-red-400 text-sm">Sair</button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <Card title="Total" value={total} color="blue"/>
        <Card title="Fechados" value={fechados} color="green"/>
        <Card title="Pendentes" value={total - fechados} color="red"/>
      </div>

      {/* PROGRESSO */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex justify-between mb-2">
          <span>Progresso</span>
          <span>{perc}%</span>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full">
          <div className="h-3 bg-green-500 rounded-full" style={{ width: `${perc}%` }}/>
        </div>

        <div className="mt-2 text-sm">
          {perc === 100 && "🎉 Tudo concluído!"}
          {perc >= 80 && perc < 100 && "⚠️ Falta pouco"}
          {perc < 50 && "🚨 Muitas pendências"}
        </div>
      </div>

      {/* CADASTRO */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-2">
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Cliente" className="border p-2 rounded"/>
        <select value={responsavel} onChange={e=>setResponsavel(e.target.value)} className="border p-2 rounded">
          {responsaveis.map(r=><option key={r}>{r}</option>)}
        </select>
        <button onClick={addCliente} className="bg-blue-500 text-white px-4 rounded">Adicionar</button>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th>Resp</th>
              <th>Fin</th>
              <th>Fis</th>
              <th>Fol</th>
              <th>Conc</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtrados.map(c=>{
              const fechado = c.financeiro && c.fiscal && c.folha && c.conciliado

              return (
                <tr key={c.id} className="border-t hover:bg-gray-50 text-center">
                  <td className="text-left p-3 font-medium">{c.nome}</td>

                  <td>
                    <select value={c.responsavel} onChange={e=>mudarResp(c.cliente_id,e.target.value)}>
                      {responsaveis.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </td>

                  {['financeiro','fiscal','folha','conciliado'].map(campo=>(
                    <td key={campo}>
                      <input type="checkbox" checked={(c as any)[campo]} onChange={e=>atualizar(c.id,campo,e.target.checked)}/>
                    </td>
                  ))}

                  <td>
                    {fechado ? "🟢 Fechado" : "🔴 Pendente"}
                  </td>

                  <td>
                    <button onClick={()=>excluir(c.cliente_id)} className="text-red-400 text-xs">Excluir</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function Card({title,value,color}:{title:string,value:number,color:string}){
  const colors:any = {
    blue:"text-blue-600",
    green:"text-green-600",
    red:"text-red-600"
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  )
}
