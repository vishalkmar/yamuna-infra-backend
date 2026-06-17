// Live "tools" the AI can call to answer from REAL-TIME data (Module A15).
// Each tool maps to a read-only GET API; run() fetches current data directly
// from the model (no storage, no side effects — call & reply). The bot uses
// these when the user's question matches a tool's keywords.
const TempleModel = require('../models/TempleModel');
const HealthcareModel = require('../models/HealthcareModel');
const MealModel = require('../models/MealModel');
const TransportModel = require('../models/TransportModel');
const CommunityModel = require('../models/CommunityModel');
const WellnessModel = require('../models/WellnessModel');
const MobilityModel = require('../models/MobilityModel');
const RewardModel = require('../models/RewardModel');

const TOOLS = [
  { name: 'temples', route: 'GET /api/temples', keywords: ['temple', 'mandir', 'aarti', 'darshan', 'banke', 'prem mandir', 'iskcon'], run: () => TempleModel.listTemples() },
  { name: 'doctors', route: 'GET /api/healthcare/doctors', keywords: ['doctor', 'doctors', 'physician', 'clinic', 'consult', 'cardio', 'pediatric', 'appointment'], run: () => HealthcareModel.listDoctors({}) },
  { name: 'food_menu', route: 'GET /api/meal/food/categories', keywords: ['food', 'menu', 'eat', 'meal', 'breakfast', 'lunch', 'dinner', 'order food'], run: () => MealModel.listFoodCategories() },
  { name: 'tiffin_plans', route: 'GET /api/meal/tiffin/plans', keywords: ['tiffin', 'subscription', 'plan', 'monthly food'], run: () => MealModel.listTiffinPlans() },
  { name: 'transport', route: 'GET /api/transport/vehicles', keywords: ['cab', 'taxi', 'auto', 'ride', 'transport', 'car', 'bus', 'fare', 'vehicle'], run: () => TransportModel.listVehicles() },
  { name: 'amenities', route: 'GET /api/amenities', keywords: ['amenity', 'amenities', 'clubhouse', 'hall', 'pool', 'court', 'lawn', 'gym', 'book facility'], run: () => CommunityModel.listAmenities() },
  { name: 'wellness', route: 'GET /api/wellness/therapies', keywords: ['wellness', 'spa', 'massage', 'yoga', 'meditation', 'therapy', 'ayurveda', 'panchakarma'], run: () => WellnessModel.listTherapies() },
  { name: 'spiritual', route: 'GET /api/spiritual/services', keywords: ['puja', 'seva', 'havan', 'pandit', 'rudrabhishek', 'satyanarayan'], run: () => WellnessModel.listSpiritualServices() },
  { name: 'mobility', route: 'GET /api/mobility/equipment', keywords: ['wheelchair', 'walker', 'mobility', 'scooter', 'crutch', 'commode', 'bed'], run: () => MobilityModel.listAids({}) },
  { name: 'rewards', route: 'GET /api/rewards/offers', keywords: ['reward', 'points', 'offer', 'redeem', 'voucher', 'cashback'], run: () => RewardModel.listOffers() },
  { name: 'announcements', route: 'GET /api/community/announcements', keywords: ['announcement', 'notice', 'maintenance', 'water supply', 'update'], run: () => CommunityModel.listAnnouncements() },
  { name: 'events', route: 'GET /api/community/events', keywords: ['event', 'events', 'celebration', 'festival', 'workshop'], run: () => CommunityModel.listEvents() },
];

// Pick tools whose keywords appear in the question (max `limit`).
function matchTools(question, limit = 2) {
  const q = String(question || '').toLowerCase();
  const scored = TOOLS
    .map(t => ({ t, score: t.keywords.reduce((s, k) => s + (q.includes(k) ? 1 : 0), 0) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.t);
}

// Run matched tools and return a compact LIVE-DATA context block (or '').
async function gather(question) {
  const tools = matchTools(question);
  if (!tools.length) return { text: '', used: [] };
  const blocks = [];
  const used = [];
  for (const t of tools) {
    try {
      const data = await t.run();
      const json = JSON.stringify(data).slice(0, 1500);
      blocks.push(`# ${t.name} (live, ${t.route})\n${json}`);
      used.push(t.name);
    } catch (_) { /* skip a failing tool */ }
  }
  return { text: blocks.join('\n\n'), used };
}

module.exports = { TOOLS, matchTools, gather };
