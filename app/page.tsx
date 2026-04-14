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

  // LOGIN
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

    // 🔥 ORDEM ALFABÉTICA FIXA
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
      <div className="h-screen flex items-center justify-center">
        <input type="password" onChange={e=>setSenhaInput(e.target.value)} />
        <button onClick={login}>Entrar</button>
      </div>
    )
  }

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" width={40} height={40} alt="logo"/>
          <h1 className="font-bold text-xl">RESULTS CONTADORES</h1>
        </div>

        <div className="flex gap-2">
          <select value={mes} onChange={e=>setMes(Number(e.target.value))}>
            {[...Array(12)].map((_,i)=><option key={i}>{i+1}</option>)}
          </select>

          <input value={ano} onChange={e=>setAno(Number(e.target.value))}/>

          <select value={filtroResp} onChange={e=>setFiltroResp(e.target.value)}>
            <option>Todos</option>
            {responsaveis.map(r=><option key={r}>{r}</option>)}
          </select>

          <label>
            <input type="checkbox" checked={somentePendentes} onChange={e=>setSomentePendentes(e.target.checked)}/>
            Pendentes
          </label>

          <button onClick={logout}>Sair</button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="mb-6">
        <div>Total: {total} | Fechados: {fechados} | {perc}%</div>
      </div>

      {/* CADASTRO */}
      <div className="mb-6">
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Cliente"/>
        <select value={responsavel} onChange={e=>setResponsavel(e.target.value)}>
          {responsaveis.map(r=><option key={r}>{r}</option>)}
        </select>
        <button onClick={addCliente}>Adicionar</button>
      </div>

      {/* TABELA */}
      <table className="w-full">
        <thead>
          <tr>
            <th>Cliente</th>
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
              <tr key={c.id}>
                <td>{c.nome}</td>

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

                <td>{fechado ? '🟢 Fechado' : '🔴 Pendente'}</td>

                <td>
                  <button onClick={()=>excluir(c.cliente_id)}>Excluir</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

    </div>
  )
}
