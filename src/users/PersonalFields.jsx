import React from 'react'
import { Field } from '../components/Form.jsx'
import { cpfMask, today } from './personal.js'

export default function PersonalFields({ values, onChange, readOnlyIdentity = false, required = false }) {
  return <>
    <Field label={`CPF${required ? ' *' : ''}`} name="cpf" value={cpfMask(values.cpf)} inputMode="numeric" maxLength={14}
      required={required} readOnly={readOnlyIdentity} autoComplete="off" onChange={event => onChange('cpf', cpfMask(event.target.value))} />
    <Field label={`Data de nascimento${required ? ' *' : ''}`} name="dataNascimento" type="date" value={values.dataNascimento || ''}
      max={today()} min="0001-01-01" required={required} readOnly={readOnlyIdentity} onChange={event => onChange('dataNascimento', event.target.value)} />
    <Field label="Telefone (opcional, com código do país)" name="telefone" type="tel" placeholder="+5548999999999" maxLength={40}
      value={values.telefone || ''} onChange={event => onChange('telefone', event.target.value)} />
    <Field label="Endereço (opcional)" name="endereco" maxLength={500} value={values.endereco || ''}
      onChange={event => onChange('endereco', event.target.value)} />
  </>
}
