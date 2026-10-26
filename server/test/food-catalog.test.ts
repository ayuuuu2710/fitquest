import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateFoodNutrition, foodCatalog, getFoodById } from '../src/data/food-catalog.js'

test('catalog nutrition is calculated from the selected server-side food and serving count', () => {
  const apple = getFoodById('apple-medium')
  assert.ok(apple)
  assert.deepEqual(calculateFoodNutrition(apple, 1.5), {
    calories: 142.5,
    proteinGrams: 0.8,
    carbsGrams: 37.5,
    fatGrams: 0.5,
  })
})

test('every catalog entry has a stable id and an explicit estimate source', () => {
  assert.equal(new Set(foodCatalog.map((food) => food.id)).size, foodCatalog.length)
  assert.ok(foodCatalog.every((food) => food.source === 'starter-estimate'))
})

test('unknown food ids do not resolve to a catalog entry', () => {
  assert.equal(getFoodById('client-invented-food'), undefined)
})

