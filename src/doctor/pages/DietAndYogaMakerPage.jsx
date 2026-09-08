import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { openLifestylePlanPrintWindow } from '../../lib/prescriptionPrint.js';

// Pre-built evidence-based clinical templates
export const CLINICAL_TEMPLATES = {
  pcos: {
    id: 'pcos',
    name: 'PCOS Insulin & Hormone Sensitizing Protocol',
    subtitle: 'Low-GI, high-fiber, androgens-downregulation with pelvic circulation asanas',
    badge: 'PCOS & Ovulation',
    macros: { calories: '1550 kcal', protein: '80g (25g/meal)', carbs: '35% (Low-GI)', fats: '30% (Omega-3)', fiber: '32g+' },
    dietType: 'Low-GI Mediterranean / Indian Vegetarian',
    meals: [
      { id: 'm1', time: '06:30 AM', meal: 'Awakening Metabolic Elixir', foods: '1 glass warm water with 1 tbsp soaked methi (fenugreek) seeds + 5 soaked almonds + 2 walnuts', portion: '1 glass + 1 handful', notes: 'Improves fasting insulin and blunts morning cortisol' },
      { id: 'm2', time: '08:30 AM', meal: 'Balanced Breakfast', foods: '2 Besan / Moong dal vegetable chillas with grated paneer and spinach + green mint coriander chutney', portion: '2 chillas (approx 200g)', notes: 'High-protein start prevents mid-morning cravings' },
      { id: 'm3', time: '11:00 AM', meal: 'Mid-Morning Hormonal Tea', foods: '1 cup freshly brewed pure spearmint tea + 1 green apple or guava with a pinch of cinnamon', portion: '1 cup + 1 fruit', notes: 'Spearmint is clinically proven to reduce free testosterone' },
      { id: 'm4', time: '01:30 PM', meal: 'Anti-Inflammatory Lunch Plate', foods: '1 big bowl cucumber carrot flaxseed salad + 2 jowar or multi-millet rotis + 1 bowl thick yellow dal + 1 cup fresh probiotic curd', portion: 'Standard plate (50% fiber, 25% protein, 25% carb)', notes: 'Eat salad first to blunt postprandial glucose spike' },
      { id: 'm5', time: '05:00 PM', meal: 'Evening Energizer', foods: '1 bowl dry roasted makhana (foxnuts) with turmeric and rock salt OR boiled sprouted moong chaat', portion: '1 small bowl (40g)', notes: 'Low sodium, gut-friendly satiety snack' },
      { id: 'm6', time: '07:30 PM', meal: 'Light Nourishing Dinner', foods: 'Clear vegetable ginger soup + stir-fried paneer/tofu with broccoli, capsicum and bell peppers + 1 small cup quinoa/millet khichdi', portion: 'Light portion, finish 3 hrs before sleep', notes: 'Light carb dinner supports overnight melatonin production' },
      { id: 'm7', time: '09:30 PM', meal: 'Restorative Bedtime Drink', foods: 'Warm unsweetened almond or A2 milk with a pinch of nutmeg and organic turmeric', portion: '1 small cup (150ml)', notes: 'Magnesium and nutmeg for deep restorative delta sleep' },
    ],
    dos: ['Cruciferous greens (broccoli, kale, spinach)', 'Omega-3 rich chia seeds & walnuts', 'Spearmint tea (2 cups/day)', 'Apple Cider Vinegar (1 tbsp before heavy meals)', 'A2 Ghee / Cold pressed mustard oil in moderation', 'Probiotic curd & fermented kanji'],
    donts: ['Refined white sugar and bakery items (maida)', 'High-fructose corn syrup & sweetened fruit juices', 'Ultra-processed seed oils (refined sunflower, soybean)', 'Deep-fried snacks & packaged namkeen', 'Late night snacking after 8:30 PM', 'Excess caffeine (>2 cups daily)'],
    yoga: {
      phase: 'Universal / Cycle Regulating',
      frequency: '5–6 Days / Week, 35–45 minutes',
      asanas: [
        { id: 'y1', name: 'Baddha Konasana (Bound Angle Butterfly)', duration: '5 mins / 12 deep breaths', benefit: 'Increases arterial pelvic perfusion to ovaries and uterus, softens pelvic floor', cues: 'Sit erect, soles together, flutter gently without jerking knees' },
        { id: 'y2', name: 'Supta Baddha Konasana (Reclining Butterfly)', duration: '7–10 mins (Restorative)', benefit: 'Down-regulates sympathetic overdrive and relieves ovarian congestion', cues: 'Use a bolster along the spine and blocks under outer thighs for zero strain' },
        { id: 'y3', name: 'Marjaryasana - Bitilasana (Cat-Cow Pose)', duration: '3 mins (10 flowing breaths)', benefit: 'Mobilizes lumbar spine, stimulates abdominal and pelvic visceral organs', cues: 'Inhale arching back with gentle gaze up; exhale rounding spine drawing navel in' },
        { id: 'y4', name: 'Malasana (Deep Yogic Garland Squat)', duration: '3 mins (With block support)', benefit: 'Releases deep tension in hip adductors and tones pelvic diaphragm', cues: 'Keep heels flat (or supported on folded blanket), palms at heart center in Anjali Mudra' },
        { id: 'y5', name: 'Viparita Karani (Legs-Up-The-Wall)', duration: '8–10 mins (Nightly)', benefit: 'Drains lymphatic fluid, lowers cortisol, stimulates thyroid & pituitary axis', cues: 'Hips snug against wall, arms opened in cactus position, deep belly breathing' },
        { id: 'y6', name: 'Setu Bandhasana (Supported Bridge Pose)', duration: '4 mins (With block under sacrum)', benefit: 'Stimulates thyroid metabolism and gently strengthens posterior chain', cues: 'Place yoga block under sacrum at medium height, relax gluteal muscles' },
      ],
      pranayama: [
        { name: 'Anulom Vilom (Alternate Nostril)', duration: '10 Mins (Morning)', benefit: 'Balances autonomic nervous system and reduces endocrine stress markers' },
        { name: 'Bhramari (Humming Bee Breath)', duration: '5 Mins (Evening)', benefit: 'Stimulates nitric oxide production and calms overstimulated amygdala' },
        { name: '4-4-4-4 Box Breathing', duration: '5 Mins (Post-Stress)', benefit: 'Activates vagus nerve, improves digestion and parasympathetic tone' },
      ],
      cardio: 'Daily 8,500 – 10,000 steps. Mandatory 15-minute gentle stroll 20 mins after lunch & dinner to flatten glucose spikes.',
      precautions: 'Avoid intense hot yoga and extreme abdominal breath-holding (Kumbhaka) during active menstrual days.',
    },
    followUp: 'Review in 4 weeks with morning fasting glucose and symptom log.',
    notes: 'Prioritize protein at breakfast and never skip meals. Sustainable lifestyle modification is the cornerstone of PCOS reversal.',
  },
  fertility: {
    id: 'fertility',
    name: 'Fertility & Luteal Phase Nourishment Protocol',
    subtitle: 'Nutrient-dense warm whole foods, folate, uterine blood flow & restorative yoga',
    badge: 'Preconception & Fertility',
    macros: { calories: '1800 kcal', protein: '75g - 85g', carbs: '40% (Whole grains)', fats: '35% (Healthy fats)', fiber: '35g+' },
    dietType: 'Nutrient-Dense Whole Foods / High Folate',
    meals: [
      { id: 'm1', time: '06:30 AM', meal: 'Womb Warming Drink', foods: 'Warm water with soaked black raisins, saffron strands, and 2 soaked figs + walnuts', portion: '1 cup + soaked dry fruits', notes: 'High iron and micronutrient support for follicular growth' },
      { id: 'm2', time: '08:30 AM', meal: 'Fertility Power Breakfast', foods: 'Avocado & poached egg on sourdough OR Sprouted ragi porridge with soaked pumpkin & sunflower seeds', portion: '1 large bowl (25g protein)', notes: 'Rich in zinc, selenium, and essential fatty acids' },
      { id: 'm3', time: '11:00 AM', meal: 'Hydrating Antioxidant Boost', foods: 'Fresh tender coconut water OR 1 cup pomegranate seeds with crushed chia', portion: '1 glass / 1 cup', notes: 'Electrolytes and nitric oxide precursors for uterine lining perfusion' },
      { id: 'm4', time: '01:30 PM', meal: 'Warm Wholesome Lunch', foods: '1 bowl warm beet & spinach soup + 2 multigrain rotis + dal palak with A2 cow ghee + steamed seasonal vegetables', portion: 'Nutrient-dense warm plate', notes: 'Avoid cold/raw foods during luteal phase' },
      { id: 'm5', time: '05:00 PM', meal: 'Seed Cycling Snack', foods: '1 tbsp ground sesame & sunflower seeds (luteal) or flax & pumpkin seeds (follicular) with warm herbal tea', portion: '1 tbsp seeds + 1 cup tea', notes: 'Supports natural progesterone synthesis' },
      { id: 'm6', time: '07:30 PM', meal: 'Nourishing Dinner', foods: 'Lentil & vegetable stew with sweet potato mash OR Grilled wild salmon/paneer with steamed asparagus', portion: 'Light and warm, easy digestion', notes: 'High folate and antioxidants for oocyte quality' },
      { id: 'm7', time: '09:30 PM', meal: 'Night Moon Milk', foods: 'Warm A2 milk with organic ashwagandha, cardamom, and saffron', portion: '150ml', notes: 'Soothes nervous system and supports implantation' },
    ],
    dos: ['Warm cooked soups and stews', 'Folate-rich greens (spinach, methi, asparagus)', 'Healthy fats (avocado, A2 ghee, extra virgin olive oil)', 'Sesame and pumpkin seeds (zinc & magnesium)', 'Pomegranate and dark berries', 'Bone broth or fortified plant broths'],
    donts: ['Iced cold beverages and excessive raw cold salads', 'Artificial sweeteners and diet sodas', 'Processed cured meats and refined oils', 'High mercury fish (tuna, swordfish)', 'Excessive high-intensity exhausting cardio', 'Unmanaged chronic sleep deprivation'],
    yoga: {
      phase: 'Luteal & Implantation Supportive',
      frequency: '4–5 Days / Week, 30 minutes',
      asanas: [
        { id: 'y1', name: 'Supta Baddha Konasana (Reclined Goddess)', duration: '8 mins with bolster', benefit: 'Maximizes arterial blood flow to endometrium without abdominal pressure', cues: 'Allow knees to splay softly onto pillows, palms open facing sky' },
        { id: 'y2', name: 'Janu Sirsasana (Head-to-Knee Forward Bend)', duration: '4 mins each side', benefit: 'Massages internal reproductive organs, calms adrenal output', cues: 'Bend from hips, do not compress lower belly, use a yoga strap around foot' },
        { id: 'y3', name: 'Balasana (Supported Child\'s Pose)', duration: '5 mins', benefit: 'Deep pelvic grounding, soothes fight-or-flight nervous response', cues: 'Knees wide, big toes touching, chest resting softly on bolster' },
        { id: 'y4', name: 'Viparita Karani (Restorative Legs-up-Wall)', duration: '10 mins', benefit: 'Relieves pelvic heaviness and promotes optimal hormonal homeostasis', cues: 'Keep small folded towel under lower back for lumbar support' },
      ],
      pranayama: [
        { name: 'Nadi Shodhana (Alternate Nostril)', duration: '10 Mins (Daily)', benefit: 'Stabilizes hypothalamic-pituitary-ovarian axis' },
        { name: 'Bhramari Pranayama', duration: '5 Mins', benefit: 'Increases endogenous nitric oxide for tissue oxygenation' },
      ],
      cardio: 'Moderate 30-minute nature walks. Avoid high-impact sprinting or heavy abdominal strain during post-ovulation two-week wait.',
      precautions: 'No hot yoga, deep twists, or vigorous inversions during the luteal implantation window.',
    },
    followUp: 'Review in 4 weeks or upon next cycle day 2.',
    notes: 'Gentle warmth, emotional calm, and nutrient density create the optimal uterine environment.',
  },
  weight: {
    id: 'weight',
    name: 'Metabolic Reset & Satiety Optimization (1450 kcal)',
    subtitle: 'High-protein, glycemic blunting, non-exercise activity thermogenesis & resistance conditioning',
    badge: 'Metabolic Health',
    macros: { calories: '1450 kcal', protein: '90g (30g/meal)', carbs: '30% (Fibrous)', fats: '28%', fiber: '35g+' },
    dietType: 'High-Protein Low-Glycemic',
    meals: [
      { id: 'm1', time: '07:00 AM', meal: 'Hydration Starter', foods: '500ml warm water with 1 tbsp lemon juice and a pinch of Himalayan pink salt', portion: '500ml', notes: 'Rehydrates and kickstarts digestive peristalsis' },
      { id: 'm2', time: '08:30 AM', meal: '30g Protein Power Plate', foods: '3 scrambled eggs (or 150g grilled tofu/low-fat paneer) with sauteed bell peppers & mushrooms + 1 slice whole multigrain toast', portion: '30g protein equivalent', notes: 'Maximizes peptide YY and GLP-1 satiety hormones' },
      { id: 'm3', time: '11:30 AM', meal: 'Metabolic Tea', foods: '1 cup Japanese green tea or cinnamon infusion with 10 roasted almonds', portion: '1 cup + 10 almonds', notes: 'Catechins and EGCG support fat oxidation' },
      { id: 'm4', time: '01:30 PM', meal: 'Volume Fiber Lunch', foods: 'Large raw salad with apple cider vinegar dressing + 1 bowl yellow moong dal + 100g grilled chicken breast or paneer + 1 small millet roti', portion: 'High volume, low caloric density', notes: 'High dietary thermic effect of food (TEF)' },
      { id: 'm5', time: '05:00 PM', meal: 'Satiety Bridge', foods: '1 cup roasted chana (gram) with lemon and chopped tomatoes or cucumber sticks with hummus', portion: '1 small bowl', notes: 'Eliminates late-afternoon sugar binge risk' },
      { id: 'm6', time: '07:30 PM', meal: 'Clean Protein & Greens Dinner', foods: 'Clear vegetable broth + 150g steamed fish or grilled spiced tofu with charred broccoli and zucchini', portion: 'Finish dinner by 8:00 PM', notes: '14-hour overnight metabolic rest window (8 PM – 10 AM)' },
    ],
    dos: ['Eat protein and fiber before any carbohydrates', 'Aim for 30g protein at every main meal', '10,000 steps daily tracked on pedometer', 'Drink 3.5 litres of filtered water', 'Take a 10-min brisk walk after every meal'],
    donts: ['Liquid calories (sodas, sweetened iced teas, fruit juices)', 'Sneaky refined cooking oils and butter lathering', 'Late-night Netflix snacking', 'Eating meals while looking at phone or screen', 'Refined flour pastries and biscuits'],
    yoga: {
      phase: 'Metabolic & Muscle Toning',
      frequency: '5 Days / Week (Yoga Flow + Resistance)',
      asanas: [
        { id: 'y1', name: 'Surya Namaskar (Sun Salutations)', duration: '6–8 slow mindful rounds', benefit: 'Engages major muscle groups and enhances metabolic rate', cues: 'Synchronize movement with breath, maintain firm core' },
        { id: 'y2', name: 'Virabhadrasana II (Warrior II)', duration: '5 breaths each side', benefit: 'Builds quad and glute strength, increases glucose uptake in skeletal muscle', cues: 'Front knee over ankle, gaze softly over front fingertips' },
        { id: 'y3', name: 'Utkatasana (Chair Pose)', duration: '3 rounds of 30 seconds', benefit: 'Activates large metabolic muscles (quadriceps and glutes)', cues: 'Weight in heels, lift chest, arms extended overhead' },
        { id: 'y4', name: 'Phalakasana (Plank Pose)', duration: '3 rounds of 45 seconds', benefit: 'Core stabilization and isometric strength', cues: 'Crown of head to heels in one straight diagonal line' },
      ],
      pranayama: [
        { name: 'Kapalabhati (Gentle Skull Shining)', duration: '3 rounds of 30 pumps', benefit: 'Ignites metabolic agni and improves abdominal organ circulation' },
        { name: 'Anulom Vilom', duration: '5 Mins', benefit: 'Regulates stress hormones to reduce visceral cortisol adiposity' },
      ],
      cardio: '10,000 daily steps target. 3 sessions per week of 20-min resistance training with dumbbells or resistance bands.',
      precautions: 'Do not perform Kapalabhati during active heavy menstrual bleeding or high blood pressure.',
    },
    followUp: 'Review in 3 weeks with body composition and waist-hip circumference record.',
    notes: 'Consistency over perfection. Prioritize muscle preservation through adequate protein intake.',
  },
  endo: {
    id: 'endo',
    name: 'Endometriosis & Pelvic Pain Relief Protocol',
    subtitle: 'Strict anti-inflammatory, gut microbiome healing, Yin yoga & psoas relaxation',
    badge: 'Pelvic Pain & Endo',
    macros: { calories: '1650 kcal', protein: '75g', carbs: '40% (Anti-inflammatory)', fats: '32% (Anti-PG)', fiber: '35g+' },
    dietType: 'Anti-Inflammatory Elimination Protocol',
    meals: [
      { id: 'm1', time: '07:00 AM', meal: 'Golden Detox Elixir', foods: 'Warm water with freshly grated ginger, turmeric, pinch of black pepper and 1 tsp cold-pressed coconut oil', portion: '1 glass (250ml)', notes: 'Curcumin with piperine inhibits inflammatory COX-2 prostaglandins' },
      { id: 'm2', time: '08:30 AM', meal: 'Gluten-Free Gut Breakfast', foods: 'Chia seed pudding made with unsweetened almond milk, topped with blueberries, walnuts and hemp hearts', portion: '1 medium jar', notes: 'Zero gluten, rich in anthocyanins and neuroprotective omega-3' },
      { id: 'm3', time: '11:00 AM', meal: 'Anti-Spasmodic Tea', foods: '1 cup chamomile & fennel infusion + small handful pumpkin seeds', portion: '1 cup tea + 15g seeds', notes: 'Fennel contains anethole which relieves smooth muscle pelvic spasms' },
      { id: 'm4', time: '01:30 PM', meal: 'Cruciferous Liver Support Lunch', foods: 'Warm quinoa bowl with steamed broccoli, purple cabbage, carrots, chickpeas and lemon tahini dressing', portion: 'Warm cooked grain bowl', notes: 'Diindolylmethane (DIM) supports hepatic estrogen phase-2 detoxification' },
      { id: 'm5', time: '05:00 PM', meal: 'Therapeutic Broth', foods: '1 cup warm vegetable mushroom bone broth or seaweed soup', portion: '1 mug', notes: 'Gut mucosal barrier regeneration' },
      { id: 'm6', time: '07:30 PM', meal: 'Soothing Evening Dinner', foods: 'Mild vegetable dalia or pumpkin coconut soup with grilled tofu/salmon and steamed zucchini', portion: 'Light and warm', notes: 'Easy assimilation without nighttime fermentation or bloating' },
    ],
    dos: ['High antioxidant berries (blueberries, raspberries)', 'Cooked cruciferous vegetables for estrogen clearance', 'Wild caught oily fish or algae omega-3', 'Fresh ginger, turmeric, and rosemary', 'Adequate dietary magnesium (pumpkin seeds, spinach)', 'Organic gluten-free grains (quinoa, millets)'],
    donts: ['Cow milk dairy products (trial 6-week elimination)', 'Gluten-containing wheat, barley, and rye', 'Industrial grain-fed red meat (high arachidonic acid)', 'Alcohol and sulfites (triggers pelvic flare)', 'Processed sugars and candy', 'Artificial food dyes and preservatives'],
    yoga: {
      phase: 'Pelvic Floor De-tone & Yin Yoga',
      frequency: 'Daily gentle practice, 25–35 minutes',
      asanas: [
        { id: 'y1', name: 'Supta Baddha Konasana with Bolster', duration: '10 Mins (Deep rest)', benefit: 'Relieves hypertonic pelvic floor spasm, opens groins gently', cues: 'Arms resting wide, use weighted eye pillow for deep vagal relaxation' },
        { id: 'y2', name: 'Ananda Balasana (Happy Baby Pose)', duration: '3 Mins', benefit: 'Releases deep sacral and lower back tightness, opens hips', cues: 'Hold outer edges of feet, keep sacrum firmly pinned to the mat' },
        { id: 'y3', name: 'Supta Matsyendrasana (Gentle Supine Twist)', duration: '3 mins each side', benefit: 'Gently wrings out abdominal visceral organs, eases constipation-related pain', cues: 'Do not force knees to floor; support with pillow, breathe into lower ribs' },
        { id: 'y4', name: 'Viparita Karani (Legs Up The Wall)', duration: '10–12 Mins', benefit: 'Drains pelvic congestion and calms central nervous pain amplification', cues: 'Allow legs to relax completely, soft belly breathing' },
      ],
      pranayama: [
        { name: 'Diaphragmatic Belly Breathing', duration: '10 Mins (Morning & Night)', benefit: 'Drops intra-abdominal pressure and desensitizes pelvic pain pathways' },
        { name: 'Sheetali Pranayama', duration: '5 Mins', benefit: 'Cooling breath reduces systemic inflammatory heat' },
      ],
      cardio: 'Gentle low-impact walking and swimming. Strictly avoid high-impact jumping, crunching, or strenuous core work during pain flares.',
      precautions: 'Never push through sharp pelvic pain. Modify every pose with pillows, bolsters, and blocks.',
    },
    followUp: 'Review in 4 weeks with daily pain and cycle score diary.',
    notes: 'Endometriosis is a systemic inflammatory condition. Calming the nervous system and healing the gut microbiome reduces pain significantly.',
  },
};

// Generate clean textual summary for printing and standard prescriptions
export const formatClinicalDietText = (templateOrData) => {
  if (!templateOrData) return '';
  const dietType = templateOrData.dietType || 'Clinical Regimen';
  const macros = templateOrData.macros || {};
  const meals = templateOrData.meals || [];
  const dos = templateOrData.dos || [];
  const donts = templateOrData.donts || [];

  let out = `CLINICAL DIETARY REGIMEN (${dietType.toUpperCase()})\n`;
  if (macros.calories || macros.protein || macros.fiber) {
    out += `Calorie Target: ${macros.calories || 'Individualized'} | Protein: ${macros.protein || 'Balanced'} | Carbs: ${macros.carbs || 'Low-GI'} | Fiber: ${macros.fiber || '30g+'}\n\n`;
  }
  if (meals.length > 0) {
    out += `DAILY MEAL-BY-MEAL TIMETABLE:\n`;
    meals.forEach(m => {
      out += `• [${m.time}] ${m.meal}:\n  ${m.foods} ${m.portion ? `(Portion: ${m.portion})` : ''}\n  Clinical Note: ${m.notes || 'Follow portion guidance'}\n\n`;
    });
  }
  if (dos.length > 0) {
    out += `RECOMMENDED FOODS TO INCLUDE:\n${dos.map(d => `✓ ${d}`).join('\n')}\n\n`;
  }
  if (donts.length > 0) {
    out += `FOODS TO STRICTLY AVOID / ELIMINATE:\n${donts.map(d => `✗ ${d}`).join('\n')}\n`;
  }
  return out.trim();
};

export const formatClinicalYogaText = (templateOrData) => {
  if (!templateOrData) return '';
  const yoga = templateOrData.yoga || templateOrData;
  const phase = yoga.phase || 'Mindful Movement';
  const frequency = yoga.frequency || '5–6 Days / Week';
  const asanas = yoga.asanas || [];
  const pranayama = yoga.pranayama || [];
  const cardio = yoga.cardio || '';
  const precautions = yoga.precautions || '';

  let out = `MINDFUL MOVEMENT & YOGA THERAPY (${phase.toUpperCase()})\n`;
  out += `Frequency: ${frequency}\n\n`;
  if (asanas.length > 0) {
    out += `PRESCRIBED HORMONAL ASANAS:\n`;
    asanas.forEach((a, i) => {
      out += `${i + 1}. ${a.name} (${a.duration})\n   Benefit: ${a.benefit}\n   Alignment & Cue: ${a.cues}\n\n`;
    });
  }
  if (pranayama.length > 0) {
    out += `PRANAYAMA & BREATHWORK PROTOCOL:\n`;
    pranayama.forEach(p => {
      out += `• ${p.name} (${p.duration}): ${p.benefit}\n`;
    });
  }
  if (cardio) out += `\nDAILY CARDIO & STEPS: ${cardio}\n`;
  if (precautions) out += `\nCLINICAL PRECAUTIONS & RED FLAGS: ${precautions}\n`;
  return out.trim();
};

export default function DietAndYogaMakerPage({ patient, onBack, onSaveProtocol, activePlan }) {
  const { user } = useAuth();
  const toast = useToast();

  const doctorName = user?.name || user?.profile?.full_name || 'Dr. Sarah Mitchell';
  const doctorSpecialty = user?.profile?.specialty || 'Gynaecologist & Clinical Lifestyle Specialist';
  const doctorReg = user?.profile?.registration_no || 'KMC-84920';

  // Active builder tab
  const [activeTab, setActiveTab] = useState('diet'); // 'diet' | 'yoga' | 'lifestyle' | 'preview'
  const [selectedTemplate, setSelectedTemplate] = useState('pcos');

  // Form State initialized from PCOS template or activePlan
  const initialData = CLINICAL_TEMPLATES.pcos;
  const [dietType, setDietType] = useState(initialData.dietType);
  const [macros, setMacros] = useState(initialData.macros);
  const [meals, setMeals] = useState(initialData.meals);
  const [dos, setDos] = useState(initialData.dos);
  const [donts, setDonts] = useState(initialData.donts);
  const [newDo, setNewDo] = useState('');
  const [newDont, setNewDont] = useState('');

  // Yoga & Movement State
  const [yogaPhase, setYogaPhase] = useState(initialData.yoga.phase);
  const [yogaFrequency, setYogaFrequency] = useState(initialData.yoga.frequency);
  const [asanas, setAsanas] = useState(initialData.yoga.asanas);
  const [pranayama, setPranayama] = useState(initialData.yoga.pranayama);
  const [cardio, setCardio] = useState(initialData.yoga.cardio);
  const [precautions, setPrecautions] = useState(initialData.yoga.precautions);

  // Lifestyle & Follow-up State
  const [followUpAdvice, setFollowUpAdvice] = useState(initialData.followUp);
  const [clinicalNotes, setClinicalNotes] = useState(initialData.notes);
  const [waterIntake, setWaterIntake] = useState('3.0 – 3.5 Litres Daily');
  const [sleepTarget, setSleepTarget] = useState('7.5 – 8 Hours (Bedtime by 10:30 PM)');
  const [submitting, setSubmitting] = useState(false);

  // Quick Asana Library to insert
  const ASANA_LIBRARY = [
    { name: 'Baddha Konasana (Butterfly Pose)', duration: '5 mins', benefit: 'Stimulates pelvic blood flow and eases ovarian congestion', cues: 'Sit tall, soles together, flutter gently' },
    { name: 'Supta Baddha Konasana (Reclining Butterfly)', duration: '8 mins', benefit: 'Calms sympathetic nervous system and relieves pelvic floor spasm', cues: 'Use bolster along spine, blocks under knees' },
    { name: 'Marjaryasana-Bitilasana (Cat-Cow)', duration: '3 mins', benefit: 'Increases pelvic mobility and massages abdominal viscera', cues: 'Synchronize arching and rounding with slow breathing' },
    { name: 'Malasana (Deep Yogic Squat)', duration: '3 mins', benefit: 'Releases deep hip flexors and strengthens pelvic diaphragm', cues: 'Keep heels flat on block or folded towel' },
    { name: 'Viparita Karani (Legs-Up-The-Wall)', duration: '10 mins', benefit: 'Promotes venous return, lymph drainage, reduces cortisol', cues: 'Hips against wall, arms in cactus position' },
    { name: 'Setu Bandhasana (Supported Bridge)', duration: '4 mins', benefit: 'Stimulates thyroid gland and strengthens pelvic floor', cues: 'Yoga block placed under sacrum at medium height' },
    { name: 'Balasana (Supported Child\'s Pose)', duration: '5 mins', benefit: 'Deep restorative grounding, soothes adrenal fatigue', cues: 'Knees wide, big toes touching, chest on bolster' },
    { name: 'Bhujangasana (Gentle Cobra Pose)', duration: '3 mins', benefit: 'Opens chest and gently tones reproductive organs', cues: 'Keep elbows slightly bent, shoulders rolled back' },
    { name: 'Matsyasana (Supported Fish Pose)', duration: '4 mins', benefit: 'Opens thoracic diaphragm, stimulates thyroid and thymus', cues: 'Place block or rolled towel between shoulder blades' },
    { name: 'Janu Sirsasana (Head-to-Knee Pose)', duration: '4 mins', benefit: 'Calms mind, stretches hamstrings and relieves menstrual cramps', cues: 'Fold forward from hips without curving spine' },
  ];

  // Load an existing plan if passed or apply template
  const applyTemplate = (tmplKey) => {
    const tmpl = CLINICAL_TEMPLATES[tmplKey];
    if (!tmpl) return;
    setSelectedTemplate(tmplKey);
    setDietType(tmpl.dietType);
    setMacros({ ...tmpl.macros });
    setMeals([...tmpl.meals]);
    setDos([...tmpl.dos]);
    setDonts([...tmpl.donts]);
    setYogaPhase(tmpl.yoga.phase);
    setYogaFrequency(tmpl.yoga.frequency);
    setAsanas([...tmpl.yoga.asanas]);
    setPranayama([...tmpl.yoga.pranayama]);
    setCardio(tmpl.yoga.cardio);
    setPrecautions(tmpl.yoga.precautions);
    setFollowUpAdvice(tmpl.followUp);
    setClinicalNotes(tmpl.notes);
    toast(`Loaded ${tmpl.name} template!`, 'success');
  };

  // Helper meal updates
  const handleUpdateMeal = (id, field, val) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const handleAddMeal = () => {
    const newId = `m_${Date.now()}`;
    setMeals(prev => [
      ...prev,
      { id: newId, time: '12:00 PM', meal: 'Custom Meal Slot', foods: '', portion: '', notes: '' }
    ]);
  };

  const handleRemoveMeal = (id) => {
    if (meals.length <= 1) return;
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  // Asana handlers
  const handleUpdateAsana = (id, field, val) => {
    setAsanas(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a));
  };

  const handleAddAsana = (preset = null) => {
    const newId = `y_${Date.now()}`;
    const base = preset || {
      name: 'Custom Asana Pose',
      duration: '5 mins',
      benefit: 'Targeted pelvic and hormonal balance',
      cues: 'Maintain steady diaphragmatic breath'
    };
    setAsanas(prev => [...prev, { id: newId, ...base }]);
  };

  const handleRemoveAsana = (id) => {
    if (asanas.length <= 1) return;
    setAsanas(prev => prev.filter(a => a.id !== id));
  };

  // Do / Dont tag handlers
  const handleAddDo = () => {
    if (!newDo.trim()) return;
    setDos(prev => [...prev, newDo.trim()]);
    setNewDo('');
  };
  const handleRemoveDo = (idx) => setDos(prev => prev.filter((_, i) => i !== idx));

  const handleAddDont = () => {
    if (!newDont.trim()) return;
    setDonts(prev => [...prev, newDont.trim()]);
    setNewDont('');
  };
  const handleRemoveDont = (idx) => setDonts(prev => prev.filter((_, i) => i !== idx));

  // Generate clean textual summary for printing and standard prescriptions
  const generateFormattedDietText = () => {
    let out = `CLINICAL DIETARY REGIMEN (${dietType.toUpperCase()})\n`;
    out += `Calorie Target: ${macros.calories} | Protein: ${macros.protein} | Carbs: ${macros.carbs} | Fiber: ${macros.fiber}\n\n`;
    out += `DAILY MEAL-BY-MEAL TIMETABLE:\n`;
    meals.forEach(m => {
      out += `• [${m.time}] ${m.meal}:\n  ${m.foods} ${m.portion ? `(Portion: ${m.portion})` : ''}\n  Clinical Note: ${m.notes}\n\n`;
    });
    out += `RECOMMENDED FOODS TO INCLUDE:\n${dos.map(d => `✓ ${d}`).join('\n')}\n\n`;
    out += `FOODS TO STRICTLY AVOID / ELIMINATE:\n${donts.map(d => `✗ ${d}`).join('\n')}\n`;
    return out.trim();
  };

  const generateFormattedYogaText = () => {
    let out = `MINDFUL MOVEMENT & YOGA THERAPY (${yogaPhase.toUpperCase()})\n`;
    out += `Frequency: ${yogaFrequency}\n\n`;
    out += `PRESCRIBED HORMONAL ASANAS:\n`;
    asanas.forEach((a, i) => {
      out += `${i + 1}. ${a.name} (${a.duration})\n   Benefit: ${a.benefit}\n   Alignment & Cue: ${a.cues}\n\n`;
    });
    out += `PRANAYAMA & BREATHWORK PROTOCOL:\n`;
    pranayama.forEach(p => {
      out += `• ${p.name} (${p.duration}): ${p.benefit}\n`;
    });
    out += `\nDAILY CARDIO & STEPS: ${cardio}\n`;
    if (precautions) out += `\nCLINICAL PRECAUTIONS & RED FLAGS: ${precautions}\n`;
    return out.trim();
  };

  // Preview & Print A4
  const handlePrintA4 = () => {
    openLifestylePlanPrintWindow({
      rxId: activePlan?.rxId ? `HN-${String(activePlan.rxId).slice(0, 8).toUpperCase()}` : 'HN-LIFESTYLE-CHART',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctor: { name: doctorName, specialty: doctorSpecialty, regNo: doctorReg },
      patient: { 
        name: patient?.name, 
        age: patient?.age, 
        gender: patient?.gender || 'Female',
        blood: patient?.blood,
        mrn: patient?.mrn,
        id: patient?.id,
      },
      diagnosis: patient?.diagnosis && patient.diagnosis !== 'Pending' ? patient.diagnosis : undefined,
      dietPlan: generateFormattedDietText(),
      exercisePlan: generateFormattedYogaText(),
      structuredData: {
        macros,
        dietType,
        meals,
        dos,
        donts,
        yogaPhase,
        yogaFrequency,
        asanas,
        pranayama,
        cardio,
        precautions,
        followUpAdvice,
        clinicalNotes,
      },
    });
  };

  // Save to Patient Record
  const handleSaveProtocol = async () => {
    setSubmitting(true);
    try {
      const dietText = generateFormattedDietText();
      const yogaText = generateFormattedYogaText();

      const protocolPayload = {
        diagnosis: patient.diagnosis && patient.diagnosis !== 'Pending' ? patient.diagnosis : 'Clinical Lifestyle & Nutrition Protocol',
        instructions: JSON.stringify({
          type: 'healnari-holistic-v1',
          clinicalNotes: clinicalNotes.trim(),
          dietPlan: dietText,
          exercisePlan: yogaText,
          followUpAdvice: followUpAdvice.trim(),
          dietSchedule: meals,
          yogaAsanas: asanas,
          macroTargets: macros,
          dos,
          donts,
        }),
        medicines: [{
          name: 'Clinical Nutrition & Mindful Movement Therapy',
          dosage: `${dietType} • ${yogaPhase}`,
          frequency: yogaFrequency,
          duration: 'Ongoing Protocol',
        }],
        followUpAdvice: followUpAdvice.trim(),
        isDraft: false,
      };

      await onSaveProtocol(protocolPayload);
      toast('Clinical Diet & Yoga Protocol saved & finalized! Synced to Patient Portal.', 'success');
      onBack();
    } catch (err) {
      toast(err.message || 'Failed to save protocol', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 animate-fade-in">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-all shadow-2xs"
              title="Return to Patient Record"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Diet &amp; Mindful Movement Chart Maker
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <i className="fas fa-seedling mr-1"></i> Clinical Protocol
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Patient: <strong className="text-slate-800 font-bold">{patient.name}</strong> • Age: {patient.age} yrs • Blood: {patient.blood} • {patient.diagnosis}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintA4}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
            >
              <i className="fas fa-print text-emerald-600"></i>
              <span>Print A4 Protocol</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSaveProtocol}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-emerald-700/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i>
                  <span>Save &amp; Finalize Protocol</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Template Quick Loader Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <i className="fas fa-wand-magic-sparkles"></i> 1-Click Evidence-Based Clinical Formulation
              </span>
              <h2 className="text-sm sm:text-base font-black text-white">
                Load Clinical Template &amp; Meal Blueprint
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Select a protocol to instantly auto-populate meals, macro ratios, hormonal asanas, and breathwork guidelines tailored for this condition.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {Object.keys(CLINICAL_TEMPLATES).map(key => {
                const tmpl = CLINICAL_TEMPLATES[key];
                const isSelected = selectedTemplate === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    <span>{tmpl.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'diet', label: '1. Diet Chart Maker', icon: 'fa-seedling', color: 'emerald' },
            { id: 'yoga', label: '2. Yoga & Movement Protocol', icon: 'fa-om', color: 'amber' },
            { id: 'lifestyle', label: '3. Hydration, Sleep & Follow-Up', icon: 'fa-droplet', color: 'purple' },
            { id: 'preview', label: '4. Live A4 Protocol Summary', icon: 'fa-file-lines', color: 'slate' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <i className={`fas ${tab.icon} text-${tab.color}-500`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: DIET CHART MAKER */}
        {activeTab === 'diet' && (
          <div className="space-y-6">
            {/* Macro & Dietary Target Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-sliders text-emerald-600"></i> Nutritional Blueprint &amp; Macro Targets
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Configure daily metabolic calorie targets and macro distribution</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Diet Classification:</span>
                  <input
                    type="text"
                    value={dietType}
                    onChange={e => setDietType(e.target.value)}
                    placeholder="e.g. Low-GI Mediterranean Vegetarian"
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                  />
                </div>
              </div>

              {/* Macro Inputs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Daily Energy', key: 'calories', placeholder: '1550 kcal' },
                  { label: 'Target Protein', key: 'protein', placeholder: '80g (25g/meal)' },
                  { label: 'Carb Split', key: 'carbs', placeholder: '35% (Low GI)' },
                  { label: 'Healthy Fats', key: 'fats', placeholder: '30% (Omega-3)' },
                  { label: 'Dietary Fiber', key: 'fiber', placeholder: '32g+ Daily' },
                ].map(item => (
                  <div key={item.key} className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3.5 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                      {item.label}
                    </label>
                    <input
                      type="text"
                      value={macros[item.key] || ''}
                      onChange={e => setMacros({ ...macros, [item.key]: e.target.value })}
                      placeholder={item.placeholder}
                      className="w-full bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Meal-by-Meal Schedule Table */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-clock text-emerald-600"></i> Structured Meal-by-Meal Timetable
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Add, customize, and adjust timing, prescribed foods, portion measures, and clinical guidance</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMeal}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-plus"></i> Add Meal Slot
                </button>
              </div>

              <div className="space-y-4">
                {meals.map((m, idx) => (
                  <div
                    key={m.id}
                    className="border border-slate-200/90 rounded-2xl p-4 md:p-5 bg-slate-50/40 hover:bg-white hover:border-emerald-300 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={m.time}
                            onChange={e => handleUpdateMeal(m.id, 'time', e.target.value)}
                            placeholder="08:30 AM"
                            className="border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-black text-slate-800 w-24 text-center bg-white"
                          />
                          <input
                            type="text"
                            value={m.meal}
                            onChange={e => handleUpdateMeal(m.id, 'meal', e.target.value)}
                            placeholder="Meal Title"
                            className="border border-slate-300 rounded-xl px-3 py-1 text-xs font-black text-emerald-900 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m.portion}
                          onChange={e => handleUpdateMeal(m.id, 'portion', e.target.value)}
                          placeholder="Portion measure (e.g. 200g, 2 chillas)"
                          className="border border-slate-200 rounded-xl px-3 py-1 text-[11px] font-semibold text-slate-600 bg-white w-48"
                        />
                        {meals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMeal(m.id)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 text-xs transition-colors"
                            title="Remove meal slot"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-8 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Prescribed Food Items &amp; Preparation Instructions
                        </label>
                        <textarea
                          rows={2}
                          value={m.foods}
                          onChange={e => handleUpdateMeal(m.id, 'foods', e.target.value)}
                          placeholder="Specify food items, ingredients, preparation and alternatives..."
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white resize-none"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Clinical Purpose / Rationale
                        </label>
                        <textarea
                          rows={2}
                          value={m.notes}
                          onChange={e => handleUpdateMeal(m.id, 'notes', e.target.value)}
                          placeholder="e.g. Blunts glucose spike, boosts dopamine..."
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Do's & Don'ts Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Foods to Include */}
              <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-circle-check text-emerald-600"></i> Foods to Prioritize &amp; Include
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                    {dos.length} Recommendations
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDo}
                    onChange={e => setNewDo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddDo())}
                    placeholder="Add recommended food (e.g. Spearmint tea, Chia seeds)..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddDo}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-2">
                  {dos.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100/80 rounded-xl px-3 py-2 text-xs">
                      <span className="text-emerald-950 font-medium flex items-center gap-2">
                        <i className="fas fa-check text-emerald-600 text-[10px]"></i> {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDo(idx)}
                        className="text-slate-400 hover:text-red-500 text-xs"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Foods to Avoid */}
              <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <h3 className="text-xs font-black text-rose-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-circle-xmark text-rose-600"></i> Foods to Strictly Avoid / Limit
                  </h3>
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                    {donts.length} Restrictions
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDont}
                    onChange={e => setNewDont(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddDont())}
                    placeholder="Add restriction (e.g. Refined maida, Soft drinks)..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddDont}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-2">
                  {donts.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-rose-50/50 border border-rose-100/80 rounded-xl px-3 py-2 text-xs">
                      <span className="text-rose-950 font-medium flex items-center gap-2">
                        <i className="fas fa-ban text-rose-600 text-[10px]"></i> {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDont(idx)}
                        className="text-slate-400 hover:text-red-500 text-xs"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: YOGA & MINDFUL MOVEMENT PROTOCOL */}
        {activeTab === 'yoga' && (
          <div className="space-y-6">
            {/* Protocol Meta */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-om text-amber-600"></i> Mindful Movement &amp; Hormonal Asana Protocol
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Define cycle-synced pelvic asanas, diaphragmatic breathwork, and step metrics</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Cycle Phase:</span>
                  <input
                    type="text"
                    value={yogaPhase}
                    onChange={e => setYogaPhase(e.target.value)}
                    placeholder="e.g. Follicular / Universal"
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                    Practice Frequency &amp; Duration
                  </label>
                  <input
                    type="text"
                    value={yogaFrequency}
                    onChange={e => setYogaFrequency(e.target.value)}
                    placeholder="e.g. 5–6 Days / Week, 35–45 minutes"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                    Cardio &amp; Daily Steps Prescription
                  </label>
                  <input
                    type="text"
                    value={cardio}
                    onChange={e => setCardio(e.target.value)}
                    placeholder="e.g. Daily 8,500 – 10,000 steps with 15-min post-meal walks"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Quick Add Asana Library */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-3xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-book-medical text-amber-600"></i> Quick Insert Hormonal Asanas
                </span>
                <span className="text-[10px] text-amber-700 font-bold">Click chip to append to routine</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {ASANA_LIBRARY.map(item => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleAddAsana(item)}
                    className="bg-white hover:bg-amber-600 hover:text-white text-slate-800 border border-amber-200 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1.5 group"
                  >
                    <i className="fas fa-plus text-[10px] text-amber-600 group-hover:text-white"></i>
                    <span>{item.name.split('(')[0]}</span>
                    <span className="text-[10px] opacity-70">({item.duration})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Asana Routine Table */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-person-praying text-amber-600"></i> Prescribed Asanas Routine
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Individualized poses, hold duration, target pelvic benefit, and alignment cues</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddAsana()}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-plus"></i> Add Custom Asana
                </button>
              </div>

              <div className="space-y-4">
                {asanas.map((a, idx) => (
                  <div
                    key={a.id}
                    className="border border-slate-200 rounded-2xl p-4 md:p-5 bg-slate-50/40 hover:bg-white hover:border-amber-300 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={a.name}
                          onChange={e => handleUpdateAsana(a.id, 'name', e.target.value)}
                          placeholder="Asana Name (English & Sanskrit)"
                          className="border border-slate-300 rounded-xl px-3 py-1 text-xs font-black text-amber-950 bg-white w-64"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={a.duration}
                          onChange={e => handleUpdateAsana(a.id, 'duration', e.target.value)}
                          placeholder="e.g. 5 mins / 10 breaths"
                          className="border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 bg-white w-40 text-center"
                        />
                        {asanas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAsana(a.id)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 text-xs transition-colors"
                            title="Remove Asana"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Target Pelvic &amp; Hormonal Benefit
                        </label>
                        <input
                          type="text"
                          value={a.benefit}
                          onChange={e => handleUpdateAsana(a.id, 'benefit', e.target.value)}
                          placeholder="e.g. Relieves ovarian congestion, tones pelvic floor..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Form Alignment, Props &amp; Modification Cues
                        </label>
                        <input
                          type="text"
                          value={a.cues}
                          onChange={e => handleUpdateAsana(a.id, 'cues', e.target.value)}
                          placeholder="e.g. Support under knees with bolster, soft belly breathing..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pranayama & Breathwork Protocol */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-wind text-teal-600"></i> Pranayama &amp; Breathwork Regimen
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Vagal nerve regulation, cortisol downregulation, and autonomic balance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pranayama.map((p, idx) => (
                  <div key={idx} className="bg-teal-50/40 border border-teal-200/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-teal-900">{p.name}</span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-md">
                        {p.duration}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{p.benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Precautions & Contraindications */}
            <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-xs space-y-2">
              <label className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-2">
                <i className="fas fa-triangle-exclamation text-amber-600"></i> Clinical Precautions &amp; Contraindications
              </label>
              <textarea
                rows={2}
                value={precautions}
                onChange={e => setPrecautions(e.target.value)}
                placeholder="Contraindications for active bleeding, pregnancy, acute pelvic inflammation..."
                className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/20"
              />
            </div>
          </div>
        )}

        {/* TAB 3: HYDRATION, SLEEP & FOLLOW-UP */}
        {activeTab === 'lifestyle' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <i className="fas fa-moon text-purple-600"></i> Sleep Hygiene &amp; Circadian Rhythm Targets
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Daily Hydration Target</label>
                  <input
                    type="text"
                    value={waterIntake}
                    onChange={e => setWaterIntake(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Restorative Sleep Window</label>
                  <input
                    type="text"
                    value={sleepTarget}
                    onChange={e => setSleepTarget(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-purple-200 p-6 shadow-xs space-y-3">
              <label className="text-xs font-black text-purple-900 uppercase tracking-wide flex items-center gap-2">
                <i className="fas fa-calendar-check text-purple-600"></i> Follow-Up Consultation Target
              </label>
              <input
                type="text"
                value={followUpAdvice}
                onChange={e => setFollowUpAdvice(e.target.value)}
                placeholder="e.g. Review in 4 weeks with repeat fasting insulin and cycle log..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300 bg-purple-50/20"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <i className="fas fa-clipboard-user text-slate-600"></i> Additional Clinical &amp; Supplement Advice
              </label>
              <textarea
                rows={4}
                value={clinicalNotes}
                onChange={e => setClinicalNotes(e.target.value)}
                placeholder="e.g. Continue inositol 2g BD, take vitamin D3 60k weekly once with milk..."
                className="w-full border border-slate-200 rounded-2xl p-4 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50/50"
              />
            </div>
          </div>
        )}

        {/* TAB 4: LIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Preview</span>
                <h3 className="text-lg font-black text-slate-900">Official Clinical Protocol Print Preview</h3>
              </div>
              <button
                type="button"
                onClick={handlePrintA4}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs"
              >
                <i className="fas fa-print"></i> Open Full A4 Print Window
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {generateFormattedDietText()}
              {'\n\n------------------------------------------------------------\n\n'}
              {generateFormattedYogaText()}
              {'\n\n------------------------------------------------------------\n'}
              Follow-Up Target: {followUpAdvice}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
