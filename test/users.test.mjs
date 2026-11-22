import { test } from 'node:test'
import assert from 'node:assert/strict'
import { profiles, validateUser } from '../src/users/validation.js'
import { validCpf, cpfMask, validatePersonal, validateContacts } from '../src/users/personal.js'

test('official profiles and password-free user contract', () => {
  assert.deepEqual(profiles, ['ADMIN', 'PACIENTE', 'MEDICO'])
  const user = { nome: 'Ana', email: 'ana@example.com', perfil: 'ADMIN', cpf: '52998224725', dataNascimento: '1990-05-20' }
  assert.equal(validateUser(user), '')
  assert.notEqual(validateUser({ ...user, perfil: 'RECEPCIONISTA' }), '')
  assert.notEqual(validateUser({ ...user, nome: ' ' }), '')
  assert.notEqual(validateUser({ ...user, email: 'invalid' }), '')
})

test('personal validation normalizes presentation without accepting invalid identity', () => {
  assert.equal(cpfMask('52998224725'), '529.982.247-25')
  assert.equal(cpfMask(null), '')
  assert.equal(validCpf('529.982.247-25'), true)
  for (const cpf of ['11111111111', '52998224724', '', 'abc52998224725']) assert.equal(validCpf(cpf), false)
  assert.equal(validatePersonal({ cpf: '52998224725', dataNascimento: '2000-02-29' }), '')
  assert.notEqual(validatePersonal({ cpf: '52998224725', dataNascimento: '2001-02-29' }), '')
  assert.notEqual(validatePersonal({ cpf: '52998224725', dataNascimento: '2999-01-01' }), '')
  assert.equal(validateContacts({ telefone: '+55 (48) 99999-9999' }), '')
  assert.notEqual(validateContacts({ telefone: '48999999999' }), '')
  assert.notEqual(validateContacts({ endereco: 'a'.repeat(501) }), '')
})
