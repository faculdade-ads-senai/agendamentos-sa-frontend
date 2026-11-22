import PersonalFields from './PersonalFields.jsx'
import { emptyPersonal, oldBirth } from './personal.js'
import React, { useEffect, useRef, useState } from 'react'
import { deactivateUser, getUser, listUsers, saveUser, createInvite, getPersonal } from '../api.jsx'
import { profiles, validateUser } from './validation.js'

const inputClass = 'w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/25'
const buttonClass = 'rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50'
const secondaryClass = 'rounded-xl border border-pine/30 px-4 py-2 text-sm font-semibold text-pine hover:bg-mint disabled:opacity-50'

function useMounted() {
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  return mounted
}

function Alert({ children, success = false }) {
  return children ? <p role={success ? 'status' : 'alert'} className={`my-4 rounded-xl p-4 text-sm ${success ? 'bg-mint text-pine' : 'bg-red-50 text-red-800'}`}>{children}</p> : null
}

export default function Users({ hash, user, onForbidden, onSelfChange }) {
  const [page, setPage] = useState(0)
  const [notice, setNotice] = useState('')
  const edit = /^#\/usuarios\/([1-9]\d*)\/editar$/.exec(hash)
  const creating = hash === '#/usuarios/novo'
  const listing = hash === '#/usuarios' || hash === '#/usuarios/'

  function saved(editing) {
    if (!editing) setPage(0)
    setNotice(editing ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.')
    window.location.hash = '/usuarios'
  }

  return <section aria-label="Administração de usuários">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div><p className="mb-2 text-sm text-pine">Administração</p><h1 className="font-serif text-4xl md:text-5xl">{creating ? 'Criar usuário' : edit ? 'Editar usuário' : 'Usuários'}</h1></div>
      {listing && <a href="#/usuarios/novo" className={buttonClass} onClick={() => setNotice('')}>Criar usuário</a>}
    </div>
    {listing ? <>
      <Alert success>{notice}</Alert>
      <UserList page={page} setPage={setPage} user={user} onForbidden={onForbidden} onSelfChange={onSelfChange} setNotice={setNotice} />
    </> : creating || edit ? <UserForm key={hash} id={edit ? Number(edit[1]) : null} user={user} onSaved={saved} onForbidden={onForbidden} onSelfChange={onSelfChange} />
      : <><Alert>Página não encontrada.</Alert><a href="#/usuarios" className={secondaryClass}>Voltar à listagem</a></>}
  </section>
}

function UserList({ page, setPage, user, onForbidden, onSelfChange, setNotice }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(null)
  const [invite, setInvite] = useState(null)
  const pending = useRef(false)
  const mounted = useMounted()

  async function issueInvite(target) {
    if (pending.current) return
    if (!window.confirm('Gerar convite? Um convite anterior ainda pendente será revogado.')) return
    pending.current = true
    setBusy(target.id)
    setError('')
    setInvite(null)
    try {
      const result = await createInvite(target.id)
      if (mounted.current) setInvite(result)
    } catch (problem) {
      if (mounted.current) setError(problem.message)
      if (problem.status === 403) onForbidden()
    } finally {
      pending.current = false
      if (mounted.current) setBusy(null)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setData(null)
    listUsers(page).then(result => {
      if (!active) return
      if (page > 0 && page >= result.totalPages) {
        setPage(Math.max(0, result.totalPages - 1))
        return
      }
      setData(result)
    }).catch(problem => {
      if (!active) return
      setError(problem.message)
      if (problem.status === 403) onForbidden()
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, refresh, setPage, onForbidden])

  async function inactivate(target) {
    if (pending.current) return
    const own = target.id === user.id
    if (!window.confirm(`Inativar ${target.nome} (${target.email})?${own ? '\nEsta é sua conta. Sua sessão será encerrada.' : ''}`)) return
    pending.current = true
    setBusy(target.id)
    setError('')
    setNotice('')
    try {
      await deactivateUser(target.id)
      if (!mounted.current) return
      if (own) { await onSelfChange(); return }
      setNotice('Usuário inativado com sucesso.')
      setRefresh(value => value + 1)
    } catch (problem) {
      if (!mounted.current) return
      setError(problem.message)
      if (problem.status === 403) onForbidden()
      if (problem.status === 404) setRefresh(value => value + 1)
    } finally {
      pending.current = false
      if (mounted.current) setBusy(null)
    }
  }

  return <>
    <Alert>{error}</Alert>
    {invite && <section role="dialog" aria-modal="false" aria-label="Convite gerado" className="my-4 rounded-xl border border-pine/30 bg-white p-5">
      <p>Convite válido até {new Date(invite.expiraEm).toLocaleString('pt-BR')}.</p>
      <label className="mt-3 block text-sm">Link do convite
        <input readOnly value={invite.link} onFocus={event => event.target.select()} className={inputClass} />
      </label>
      <div className="mt-3 flex gap-3">
        <button className={secondaryClass} onClick={async () => {
          try { await navigator.clipboard.writeText(invite.link); setNotice('Link copiado.') }
          catch { setNotice('Selecione o link acima e copie manualmente.') }
        }}>Copiar link</button>
        <button className={secondaryClass} onClick={() => setInvite(null)}>Fechar convite</button>
      </div>
    </section>}
    {error && <button className={secondaryClass} onClick={() => setRefresh(value => value + 1)} disabled={loading || busy != null}>Tentar novamente</button>}
    {loading ? <p role="status" className="py-10">Carregando usuários…</p> : data && <>
      <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Usuários cadastrados, incluindo contas inativas</caption>
          <thead className="bg-mint/50"><tr>{['Nome', 'E-mail', 'Perfil', 'Status', 'Ações'].map(label => <th key={label} scope="col" className="px-5 py-4">{label}</th>)}</tr></thead>
          <tbody>{data.content.map(target => <tr key={target.id} className="border-t border-ink/10">
            <td className="px-5 py-4 font-semibold">{target.nome}{target.id === user.id && <span className="ml-2 text-xs font-normal">(você)</span>}</td>
            <td className="px-5 py-4">{target.email}</td>
            <td className="px-5 py-4">{target.perfil}</td>
            <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs ${target.ativo ? 'bg-mint text-pine' : 'bg-ink/10 text-ink/70'}`}>{target.ativo ? 'Ativo' : 'Inativo'}</span><span className="mt-2 block text-xs">{target.statusCadastro}{target.master ? ' · Master' : ''}{!target.cadastroCompleto ? ' · Cadastro incompleto' : ''}</span></td>
            <td className="px-5 py-4"><div className="flex gap-4">
              {target.ativo && !target.master && !target.ativadoEm && <button disabled={busy != null} onClick={() => issueInvite(target)} className="font-semibold text-pine disabled:opacity-50">Gerar convite</button>}
              {busy == null ? <a href={`#/usuarios/${target.id}/editar`} className="font-semibold text-pine underline" aria-label={`Editar ${target.nome}`}>Editar</a> : <span className="text-ink/40">Editar</span>}
              <button disabled={target.master || !target.ativo || busy != null} onClick={() => inactivate(target)} className="font-semibold text-red-800 underline disabled:text-ink/40 disabled:no-underline" aria-label={`Inativar ${target.nome}`}>{busy === target.id ? 'Aguarde…' : 'Inativar'}</button>
            </div></td>
          </tr>)}
            {data.content.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink/65">Nenhum usuário cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>{data.totalElements} usuário(s) · Página {data.totalPages === 0 ? 0 : page + 1} de {data.totalPages}</p>
        <div className="flex gap-2">
          <button className={secondaryClass} disabled={page === 0 || busy != null} onClick={() => { setNotice(''); setPage(page - 1) }}>Anterior</button>
          <button className={secondaryClass} disabled={page + 1 >= data.totalPages || busy != null} onClick={() => { setNotice(''); setPage(page + 1) }}>Próxima</button>
        </div>
      </div>
    </>}
  </>
}

function UserForm({ id, user, onSaved, onForbidden, onSelfChange }) {
  const editing = id != null
  const [original, setOriginal] = useState(null)
  const [values, setValues] = useState({ nome: '', email: '', perfil: '', ativo: true, ...emptyPersonal, enviarDadosPessoais: !editing })
  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const mounted = useMounted()

  useEffect(() => {
    if (!editing) return
    let active = true
    setLoading(true)
    setError('')
    setLoadError(false)
    Promise.all([getUser(id), getPersonal(id)]).then(([result, personal]) => {
      if (active) {
        setOriginal(result)
        setValues({ nome: result.nome, email: result.email, perfil: result.perfil, ativo: result.ativo, ...emptyPersonal, ...Object.fromEntries(Object.entries(personal).filter(([key]) => key in emptyPersonal).map(([key, value]) => [key, value ?? ''])), enviarDadosPessoais: personal.cadastroCompleto })
      }
    }).catch(problem => {
      if (!active) return
      setLoadError(true)
      setError(problem.status === 404 ? 'Usuário não encontrado. Volte à listagem.' : problem.message)
      if (problem.status === 403) onForbidden()
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, editing, refresh, onForbidden])

  function change(event) {
    const { name, value, checked, type } = event.target
    setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  async function submit(event) {

    event.preventDefault()
    if (pending.current) return
    const validation = validateUser(values, editing)
    if (validation) { setError(validation); return }
    if (editing && id === user.id && !values.ativo
        && !window.confirm('Inativar sua própria conta? Sua sessão será encerrada.')) return
    if (values.enviarDadosPessoais && oldBirth(values.dataNascimento) && !window.confirm('Nascimento anterior a 120 anos. Confirma a data informada?')) return
    pending.current = true
    setBusy(true)
    setError('')

    try {
      await saveUser(values, id)
      if (!mounted.current) return
      if (editing && id === user.id) await onSelfChange()
      if (mounted.current) onSaved(editing)
    } catch (problem) {
      if (!mounted.current) return
      setError(problem.status === 404 ? 'Usuário não encontrado. Volte à listagem.' : problem.message)
      if (problem.status === 403) onForbidden()
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return <>
    <Alert>{error}</Alert>
    {loading ? <p role="status">Carregando usuário…</p> : loadError ? <div className="flex gap-4">
      <button className={secondaryClass} onClick={() => setRefresh(value => value + 1)}>Tentar novamente</button>
      <a href="#/usuarios" className={secondaryClass}>Voltar à listagem</a>
    </div> : <form onSubmit={submit} className="max-w-2xl rounded-2xl border border-ink/15 bg-white p-5 md:p-8">
      <fieldset disabled={busy} className="grid gap-5 disabled:opacity-70">
        <legend className="sr-only">{editing ? 'Dados do usuário' : 'Dados do novo usuário'}</legend>
        <p className="text-sm text-ink/70">* Campos obrigatórios. Dados pessoais são protegidos pelo servidor.</p>
        <div><label htmlFor="user-name" className="mb-2 block text-sm font-semibold">Nome completo *</label>
          <input id="user-name" name="nome" className={inputClass} value={values.nome} onChange={change} maxLength={120} autoComplete="off" required /></div>
        <div><label htmlFor="user-email" className="mb-2 block text-sm font-semibold">E-mail *</label>
          <input id="user-email" name="email" type="email" className={inputClass} value={values.email} readOnly={Boolean(original?.master || original?.ativadoEm)} onChange={change} maxLength={254} autoComplete="off" required /></div>
        <div><label htmlFor="user-profile" className="mb-2 block text-sm font-semibold">Perfil *</label>
          <select id="user-profile" name="perfil" className={inputClass} value={values.perfil} disabled={original?.master || id === user.id} onChange={change} required>
            <option value="" disabled>Selecione um perfil</option>{profiles.map(profile => <option key={profile} value={profile}>{profile}</option>)}
          </select></div>
        {editing && !original?.cadastroCompleto && <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="enviarDadosPessoais" checked={values.enviarDadosPessoais} onChange={change} />Regularizar cadastro incompleto</label>}
        {(!editing || values.enviarDadosPessoais) && <PersonalFields values={values} required onChange={(name, value) => setValues(previous => ({ ...previous, [name]: value }))} />}
        {editing && <label className="flex items-center gap-3 text-sm font-semibold"><input name="ativo" type="checkbox" disabled={original?.master} checked={values.ativo} onChange={change} className="size-4 accent-pine" />Usuário ativo</label>}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button className={buttonClass}>{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar usuário'}</button>
          {!busy && <a href="#/usuarios" className={secondaryClass}>Cancelar</a>}
        </div>
      </fieldset>
    </form>}
  </>
}
