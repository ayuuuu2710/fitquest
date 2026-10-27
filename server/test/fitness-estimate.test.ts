import assert from 'node:assert/strict'
import { test } from 'node:test'
import { estimateRestingEnergyKcal } from '../../src/lib/fitness.js'
import { strongPasswordSchema } from '../src/auth-validation.js'

test('resting-energy estimate uses metric measurements and the selected Mifflin–St Jeor option', () => {
  assert.equal(estimateRestingEnergyKcal({ age: 30, heightCm: 175, weightKg: 70, sexForCalculation: 'male' }), 1649)
  assert.equal(estimateRestingEnergyKcal({ age: 30, heightCm: 175, weightKg: 70, sexForCalculation: 'female' }), 1483)
})

test('does not estimate outside the adult study age range or without required data', () => {
  assert.equal(estimateRestingEnergyKcal({ age: 18, heightCm: 175, weightKg: 70, sexForCalculation: 'male' }), null)
  assert.equal(estimateRestingEnergyKcal({ age: 79, heightCm: 175, weightKg: 70, sexForCalculation: 'male' }), null)
  assert.equal(estimateRestingEnergyKcal({ age: 30, heightCm: 175, weightKg: 70, sexForCalculation: null }), null)
})

test('password rules require length, case, number, and special character', () => {
  assert.equal(strongPasswordSchema.safeParse('StrongPass123!').success, true)
  for (const password of ['shortA1!', 'alllowercase123!', 'ALLUPPERCASE123!', 'NoNumberPassword!', 'NoSpecialChar123']) {
    assert.equal(strongPasswordSchema.safeParse(password).success, false, password)
  }
})
