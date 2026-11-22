export const emptyPersonal = { cpf: '', dataNascimento: '', telefone: '', endereco: '' }
export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
export function cpfDigits(value = '') { return String(value ?? '').replace(/\D/g, '') }
export function cpfMask(value = '') {
  const digits = cpfDigits(value).slice(0, 11)
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2').replace(/(\.\d{3})(\d)/, '$1-$2')
}
export function validCpf(value) {
  if (!/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(value.trim())) return false
  const cpf = cpfDigits(value)
  if (/^(\d)\1{10}$/.test(cpf)) return false
  for (let size = 9; size <= 10; size++) {
    const sum = [...cpf.slice(0, size)].reduce((sum, digit, i) => sum + Number(digit) * (size + 1 - i), 0)
    const result = 11 - sum % 11
    if (Number(cpf[size]) !== (result >= 10 ? 0 : result)) return false
  }
  return true
}
export function validateContacts(values) {
  const phone = (values.telefone || '').replace(/[ ()-]/g, '')
  if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) return 'Informe o telefone com + e código do país.'
  if ((values.endereco || '').trim().length > 500) return 'Informe um endereço de até 500 caracteres.'
  return ''
}
export function validatePersonal(values) {
  if (!validCpf(values.cpf || '')) return 'Informe um CPF válido.'
  const date = values.dataNascimento || ''
  const parsed = new Date(date + 'T12:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '0001-01-01' || !Number.isFinite(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== date || date > today()) return 'Informe uma data de nascimento válida e não futura.'
  return validateContacts(values)
}
export function oldBirth(date) {
  const current = today()
  return date && date < `${Number(current.slice(0, 4)) - 120}${current.slice(4)}`
}
export function personalPayload(values) {
  return { cpf: cpfDigits(values.cpf), dataNascimento: values.dataNascimento,
    telefone: (values.telefone || '').replace(/[ ()-]/g, '') || null, endereco: (values.endereco || '').trim() || null }
}
