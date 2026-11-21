export const profiles = ['ADMIN', 'PACIENTE', 'MEDICO']

export function validateUser(values, editing = false) {
  if (!values.nome.trim() || values.nome.trim().length > 120) return 'Informe um nome de até 120 caracteres.'
  if (!values.email.trim() || values.email.trim().length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return 'Informe um e-mail válido de até 254 caracteres.'
  if (!profiles.includes(values.perfil)) return 'Selecione um perfil.'
  if ((!editing || values.senha !== '') && (values.senha.trim() === '' || values.senha.length < 8
      || values.senha.length > 72 || new TextEncoder().encode(values.senha).length > 72)) {
    return 'A senha deve ter de 8 a 72 caracteres.'
  }
  return ''
}

