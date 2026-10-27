export type ActivityCategory = 'Walking' | 'Running' | 'Cycling' | 'Strength training' | 'Yoga' | 'Swimming' | 'Rowing' | 'Sports' | 'Household' | 'Other cardio'
export type MeasurementType = 'duration' | 'duration-distance' | 'duration-speed'

export type ActivityDefinition = {
  id: string
  name: string
  category: ActivityCategory
  targetMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions: string
  met: number
  intensity: 'light' | 'moderate' | 'vigorous' | 'very vigorous'
  measurementType: MeasurementType
  speedKph?: number
  sourceCode: string
  source: string
  sourceUrl: string
}

const compendium = '2024 Adult Compendium of Physical Activities'
const sourceUrl = 'https://pacompendium.com/'
const categoryDetails: Record<ActivityCategory, Pick<ActivityDefinition, 'targetMuscles' | 'secondaryMuscles' | 'equipment'>> = {
  Walking: { targetMuscles: ['Calves', 'Quadriceps', 'Hamstrings', 'Glutes'], secondaryMuscles: ['Core'], equipment: ['Comfortable footwear'] },
  Running: { targetMuscles: ['Calves', 'Quadriceps', 'Hamstrings', 'Glutes'], secondaryMuscles: ['Core'], equipment: ['Running shoes'] },
  Cycling: { targetMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Calves', 'Core'], equipment: ['Bicycle or stationary bike'] },
  'Strength training': { targetMuscles: ['Depends on exercises selected'], secondaryMuscles: ['Depends on exercises selected'], equipment: ['Weights or machines'] },
  Yoga: { targetMuscles: ['Full body'], secondaryMuscles: ['Core'], equipment: ['Mat'] },
  Swimming: { targetMuscles: ['Full body', 'Shoulders', 'Back'], secondaryMuscles: ['Core'], equipment: ['Pool'] },
  Rowing: { targetMuscles: ['Back', 'Legs', 'Core'], secondaryMuscles: ['Arms', 'Shoulders'], equipment: ['Rowing ergometer'] },
  Sports: { targetMuscles: ['Full body, varies by sport'], secondaryMuscles: ['Core'], equipment: ['Varies by sport'] },
  Household: { targetMuscles: ['Full body'], secondaryMuscles: ['Core'], equipment: ['Varies by task'] },
  'Other cardio': { targetMuscles: ['Legs'], secondaryMuscles: ['Core'], equipment: ['Cardio machine'] },
}
const activity = (id: string, name: string, category: ActivityCategory, met: number, intensity: ActivityDefinition['intensity'], sourceCode: string, instructions: string, options: Partial<ActivityDefinition> = {}): ActivityDefinition => ({
  id, name, category, met, intensity, sourceCode, instructions, source: compendium, sourceUrl,
  ...categoryDetails[category], measurementType: 'duration', ...options,
})

// METs and codes below are copied from the 2024 Adult Compendium. Values that the Compendium
// marks as estimated remain explicitly identified by its original activity-code provenance.
export const activityCatalog: ActivityDefinition[] = [
  activity('walk-17152', 'Walking · 2.0–2.4 mph · slow', 'Walking', 2.8, 'light', '17152', 'Choose the closest pace for level, firm ground.', { measurementType: 'duration-distance', speedKph: 3.5 }),
  activity('walk-17190', 'Walking · 2.8–3.4 mph · moderate', 'Walking', 3.8, 'moderate', '17190', 'Choose the closest pace for level, firm ground.', { measurementType: 'duration-distance', speedKph: 5.0 }),
  activity('walk-17200', 'Walking · 3.5–3.9 mph · brisk', 'Walking', 4.8, 'vigorous', '17200', 'Choose the closest pace for level, firm ground.', { measurementType: 'duration-distance', speedKph: 6.0 }),
  activity('walk-17220', 'Walking · 4.0–4.4 mph · very brisk', 'Walking', 5.5, 'very vigorous', '17220', 'Choose the closest pace for level, firm ground.', { measurementType: 'duration-distance', speedKph: 6.8 }),
  activity('run-12028', 'Running · 4.0–4.2 mph', 'Running', 6.5, 'moderate', '12028', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 6.6 }),
  activity('run-12029', 'Running · 4.3–4.8 mph', 'Running', 7.8, 'moderate', '12029', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 7.3 }),
  activity('run-12030', 'Running · 5.0–5.2 mph', 'Running', 8.5, 'vigorous', '12030', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 8.2 }),
  activity('run-12045', 'Running · 5.5–5.8 mph', 'Running', 9.0, 'vigorous', '12045', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 9.1 }),
  activity('run-12050', 'Running · 6.0–6.3 mph', 'Running', 9.3, 'vigorous', '12050', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 9.9 }),
  activity('run-12060', 'Running · 6.7 mph', 'Running', 10.5, 'vigorous', '12060', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 10.8 }),
  activity('run-12080', 'Running · 7.5 mph', 'Running', 11.8, 'very vigorous', '12080', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 12.1 }),
  activity('run-12120', 'Running · 10 mph', 'Running', 14.8, 'very vigorous', '12120', 'Select the pace band closest to your average running speed.', { measurementType: 'duration-distance', speedKph: 16.1 }),
  activity('cycle-01015', 'Cycling · easy pace', 'Cycling', 4.3, 'light', '01015', 'Choose the effort that best matches your ride.', { measurementType: 'duration-distance' }),
  activity('cycle-01016', 'Cycling · moderate pace', 'Cycling', 7.0, 'moderate', '01016', 'Choose the effort that best matches your ride.', { measurementType: 'duration-distance' }),
  activity('cycle-01017', 'Cycling · vigorous pace', 'Cycling', 9.0, 'vigorous', '01017', 'Choose the effort that best matches your ride.', { measurementType: 'duration-distance' }),
  activity('cycle-01030', 'Cycling · 12–13.9 mph', 'Cycling', 8.0, 'vigorous', '01030', 'Choose the closest average speed for your ride.', { measurementType: 'duration-distance', speedKph: 20.8 }),
  activity('cycle-01040', 'Cycling · 14–15.9 mph', 'Cycling', 10.0, 'vigorous', '01040', 'Choose the closest average speed for your ride.', { measurementType: 'duration-distance', speedKph: 24.1 }),
  activity('cycle-01200', 'Stationary cycling · general', 'Cycling', 6.8, 'moderate', '01200', 'Choose general stationary cycling when wattage is unavailable.', { measurementType: 'duration' }),
  activity('cycle-01210', 'Stationary cycling · very light', 'Cycling', 3.5, 'light', '01210', 'Very light effort, approximately 25–30 watts.', { measurementType: 'duration-speed' }),
  activity('cycle-01220', 'Stationary cycling · moderate', 'Cycling', 6.0, 'moderate', '01220', 'Moderate to vigorous effort, approximately 90–100 watts.', { measurementType: 'duration-speed' }),
  activity('cycle-01232', 'Stationary cycling · vigorous', 'Cycling', 10.3, 'vigorous', '01232', 'Vigorous effort, approximately 151–199 watts.', { measurementType: 'duration-speed' }),
  activity('lift-02054', 'Resistance training · multiple exercises', 'Strength training', 3.5, 'moderate', '02054', 'Use for multiple exercises at varied resistance with normal rest periods.', { targetMuscles: ['Varies by exercise'], equipment: ['Weights or machines'] }),
  activity('lift-02052', 'Resistance training · squats/deadlifts', 'Strength training', 5.0, 'vigorous', '02052', 'Use for slow or explosive squat/deadlift-focused training.', { targetMuscles: ['Lower body', 'Back'], equipment: ['Barbell or weights'] }),
  activity('lift-02050', 'Weightlifting · vigorous', 'Strength training', 6.0, 'vigorous', '02050', 'Use for vigorous weightlifting, powerlifting, or bodybuilding.', { targetMuscles: ['Varies by exercise'], equipment: ['Weights or machines'] }),
  activity('lift-02040', 'Kettlebell circuit · vigorous', 'Strength training', 7.5, 'vigorous', '02040', 'Use for a vigorous circuit with kettlebells and little rest.', { targetMuscles: ['Full body'], equipment: ['Kettlebells'] }),
  activity('yoga-02175', 'Yoga · general', 'Yoga', 2.3, 'light', '02175', 'General yoga practice.', { targetMuscles: ['Full body'], equipment: ['Mat'] }),
  activity('yoga-02185', 'Yoga · Vinyasa', 'Yoga', 2.7, 'moderate', '02185', 'Vinyasa yoga practice.', { targetMuscles: ['Full body'], equipment: ['Mat'] }),
  activity('yoga-02160', 'Yoga · Power', 'Yoga', 4.0, 'vigorous', '02160', 'Power yoga practice.', { targetMuscles: ['Full body'], equipment: ['Mat'] }),
  activity('swim-18240', 'Swimming · freestyle · recreational', 'Swimming', 5.8, 'moderate', '18240', 'Select the stroke and effort that best match your swim.', { measurementType: 'duration-distance', targetMuscles: ['Full body'], equipment: ['Pool'] }),
  activity('swim-18230', 'Swimming · freestyle · fast', 'Swimming', 9.8, 'vigorous', '18230', 'Fast, vigorous freestyle lap swimming.', { measurementType: 'duration-distance', targetMuscles: ['Full body'], equipment: ['Pool'] }),
  activity('swim-18265', 'Swimming · breaststroke · recreational', 'Swimming', 5.3, 'moderate', '18265', 'Recreational breaststroke swimming.', { measurementType: 'duration-distance', targetMuscles: ['Full body'], equipment: ['Pool'] }),
  activity('row-02071', 'Rowing machine · moderate', 'Rowing', 5.0, 'moderate', '02071', 'Stationary rowing below 100 watts.', { measurementType: 'duration-speed', equipment: ['Rowing ergometer'] }),
  activity('row-02073', 'Rowing machine · vigorous', 'Rowing', 11.0, 'vigorous', '02073', 'Stationary rowing at 150–199 watts.', { measurementType: 'duration-speed', equipment: ['Rowing ergometer'] }),
  activity('elliptical-02048', 'Elliptical · moderate', 'Other cardio', 5.0, 'moderate', '02048', 'Moderate effort on an elliptical trainer.', { equipment: ['Elliptical'] }),
  activity('elliptical-02049', 'Elliptical · vigorous', 'Other cardio', 9.0, 'vigorous', '02049', 'Vigorous effort on an elliptical trainer.', { equipment: ['Elliptical'] }),
  activity('sports-15675', 'Tennis · moderate', 'Sports', 6.8, 'moderate', '15675', 'General tennis at a moderate effort.', { targetMuscles: ['Full body'], equipment: ['Racquet'] }),
  activity('sports-15676', 'Tennis · competitive', 'Sports', 8.0, 'vigorous', '15676', 'Competitive tennis.', { targetMuscles: ['Full body'], equipment: ['Racquet'] }),
  activity('sports-15690', 'Tennis · singles', 'Sports', 8.0, 'vigorous', '15690', 'Singles tennis.', { targetMuscles: ['Full body'], equipment: ['Racquet'] }),
  activity('sports-15605', 'Soccer · competitive', 'Sports', 9.5, 'vigorous', '15605', 'Competitive soccer.', { targetMuscles: ['Full body'], equipment: ['Ball'] }),
  activity('sports-15610', 'Soccer · casual', 'Sports', 7.0, 'moderate', '15610', 'Casual soccer.', { targetMuscles: ['Full body'], equipment: ['Ball'] }),
  activity('home-05010', 'Sweeping · general', 'Household', 3.3, 'moderate', '05010', 'Sweeping carpets or floors.', { targetMuscles: ['Full body'], equipment: ['Broom'] }),
  activity('home-05043', 'Vacuuming', 'Household', 3.0, 'moderate', '05043', 'General vacuuming.', { targetMuscles: ['Full body'], equipment: ['Vacuum'] }),
  activity('home-05020', 'Heavy cleaning', 'Household', 3.5, 'moderate', '05020', 'Heavy or major cleaning such as washing a car or cleaning a garage.', { targetMuscles: ['Full body'] }),
]

export const activityById = new Map(activityCatalog.map((item) => [item.id, item]))
