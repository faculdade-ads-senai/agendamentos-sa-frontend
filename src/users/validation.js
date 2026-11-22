import { validatePersonal } from './personal.js'
export const profiles = ['ADMIN', 'PACIENTE', 'MEDICO']

export function validateUser(values, editing = false) {
  if (!values.nome.trim() || values.nome.trim().length > 120) return 'Informe um nome de até 120 caracteres.'
  if (!values.email.trim() || values.email.trim().length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return 'Informe um e-mail válido de até 254 caracteres.'
  if (!profiles.includes(values.perfil)) return 'Selecione um perfil.'
  if (!editing || values.enviarDadosPessoais) return validatePersonal(values)
  return ''
}
