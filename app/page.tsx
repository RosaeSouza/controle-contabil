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

  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('Benedito')

  const [usuarioLogado, setUsuarioLogado] = useState('Todos')
  const [somentePendentes, setSomentePendentes] = useState(false)

  const [logado, setLogado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')

  const responsaveis = ['Benedito', 'Clarice', 'João Pedro']

  // LOGIN PERSISTENTE
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
  }

  async function adicionarCliente() {
    if (!nome) return alert('Digite o nome')

    await supabase.from('clientes').insert([
      { nome, responsavel }
    ])

    setNome('')
    carregarControles()
  }

  async function excluirCliente(id: string) {
    if (!confirm('Excluir cliente?')) return

    await supabase.from('clientes').delete().eq('id', id)
    carregarControles()
  }

  async function atualizarCampo(id: string, campo: string, valor: boolean) {
    await supabase.from('controles_mensais').update({ [campo]: valor }).eq('id', id)
    carregarControles()
  }

  async function alterarResponsavel(cliente_id: string, novo: string) {
    await supabase.from('clientes').update({ responsavel: novo }).eq('id', cliente_id)
    carregarControles()
  }

  const filtrados = controles.filter(c => {
    const fechado = c.financeiro && c.fiscal && c.folha && c.conciliado
    if (usuarioLogado !== 'Todos' && c.responsavel !== usuarioLogado) return false
    if (somentePendentes && fechado) return false
    return true
  })

  const total = controles.length
  const fechados = controles.filter(c => c.financeiro && c.fiscal && c.folha && c.conciliado).length
  const pendentes = total - fechados

  if (!logado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-xl shadow">
          <input
            type="password"
            placeholder="Senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="border p-2 rounded mb-4 w-full"
          />
          <button onClick={login} className="bg-blue-500 text-white w-full p-2 rounded">
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER COM LOGO */}
      <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="logo" width={40} height={40} />
          <h1 className="font-bold text-xl">RESULTS CONTADORES</h1>
        </div>

        <div className="flex gap-2">
          <select value={usuarioLogado} onChange={(e)=>setUsuarioLogado(e.target.value)} className="border p-1 rounded">
            <option>Todos</option>
            {responsaveis.map(r=><option key={r}>{r}</option>)}
          </select>

          <button onClick={logout} className="text-red-400 text-sm">Sair</button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* CARDS SUAVES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card title="Total" value={total} bg="bg-blue-50" text="text-blue-600" />
          <Card title="Fechados" value={fechados} bg="bg-green-50" text="text-green-600" />
          <Card title="Pendentes" value={pendentes} bg="bg-red-50" text="text-red-600" />
        </div>

        {/* CADASTRO */}
        <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-2 flex-wrap">
          <input
            placeholder="Nome cliente"
            value={nome}
            onChange={(e)=>setNome(e.target.value)}
            className="border p-2 rounded"
          />

          <select value={responsavel} onChange={(e)=>setResponsavel(e.target.value)} className="border p-2 rounded">
            {responsaveis.map(r=><option key={r}>{r}</option>)}
          </select>

          <button onClick={adicionarCliente} className="bg-blue-500 text-white px-4 rounded">
            Adicionar
          </button>
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
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filtrados.map(c=>(
                <tr key={c.id} className="border-t text-center">
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

                  <td>
                    <button onClick={()=>excluirCliente(c.cliente_id)} className="text-red-400 text-xs">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

function Card({title,value,bg,text}:{title:string,value:number,bg:string,text:string}){
  return (
    <div className={`${bg} p-4 rounded-xl shadow`}>
      <div className="text-sm">{title}</div>
      <div className={`text-2xl font-bold ${text}`}>{value}</div>
    </div>
  )
}
