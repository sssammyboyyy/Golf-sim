-- Seed Upsells
-- This script populates the upsells table with all PRD-specified offers
-- Includes both static (always available) and conditional upsells

-- ============================================
-- STATIC UPSELLS (Always Available)
-- ============================================

-- No trigger conditions - these are always shown
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
('Premium Golf Balls', 'High-quality Titleist Pro V1 golf balls for the perfect swing', 85.00, 'equipment', NULL, true),
('Gourmet Burger & Chips', 'Delicious gourmet burger with hand-cut chips and sauce', 120.00, 'food', NULL, true),
('Craft Beer Selection', 'Choice of premium local craft beers on tap', 65.00, 'beverage', NULL, true),
('30-Minute Private Lesson', 'One-on-one session with our PGA-certified golf pro', 450.00, 'lesson', NULL, true);

-- ============================================
-- CONDITIONAL UPSELLS
-- ============================================

-- Time Extension (show if duration < 2 hours)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Add 30 Minutes',
  'Extend your session for just R50 more - perfect for squeezing in one more round',
  50.00,
  'time_extension',
  '{"duration_less_than": 2}'::jsonb,
  true
);

-- Social Upgrade (show if 1 player)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Bring a Friend',
  'Add another player for only R120 more total - golf is better with friends!',
  120.00,
  'social_upgrade',
  '{"player_count_equals": 1}'::jsonb,
  true
);

-- Food Bundle (show if 2+ players)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Group Food Bundle',
  '4 craft beers + 2 large pizzas for your group - perfect combo for a fun session',
  299.00,
  'food_bundle',
  '{"player_count_min": 2}'::jsonb,
  true
);

-- Hook 'n Slice Wednesday Promo (Wednesday 17:00-21:00, 4+ players, 4+ hours)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Hook ''n Slice Promo',
  '4 players, 4 hours, Food & Beverage package included - Best value every Wednesday!',
  2800.00,
  'daypart_promo',
  '{"day_of_week": 3, "time_range": ["17:00", "21:00"], "player_count_min": 4, "duration_min": 4}'::jsonb,
  true
);

-- First-Time Referral Offer (show only if is_first_booking)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Refer a Friend & Save',
  'Get R100 off your next session when your friend books using your unique referral code',
  0.00,
  'referral_offer',
  '{"is_first_booking": true}'::jsonb,
  true
);

-- Adult+Child Combo Upgrade (for future combo booking feature - currently inactive)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Family Experience Upgrade',
  'Add premium balls, drinks, and complimentary photo package for the whole family',
  180.00,
  'combo_bundle',
  '{"is_combo_booking": true}'::jsonb,
  false
);

-- ============================================
-- Additional Strategic Upsells
-- ============================================

-- Weekend Special (show on weekends for 3+ hour sessions)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Weekend Caddy Package',
  'Enjoy full virtual caddy assistance plus shot analysis report for your session',
  150.00,
  'equipment',
  '{"day_of_week": [0, 6], "duration_min": 3}'::jsonb,
  true
);

-- Late Night Special (show for bookings after 20:00)
INSERT INTO upsells (name, description, price, category, trigger_condition, is_active) VALUES
(
  'Night Owl Special',
  'Add midnight snacks and energy drinks to keep your game strong',
  95.00,
  'food',
  '{"time_range": ["20:00", "23:59"]}'::jsonb,
  true
);

-- Verify data inserted
SELECT
  COUNT(*) as total_upsells,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_upsells,
  COUNT(CASE WHEN trigger_condition IS NULL THEN 1 END) as static_upsells,
  COUNT(CASE WHEN trigger_condition IS NOT NULL THEN 1 END) as conditional_upsells
FROM upsells;

-- Expected results:
-- total_upsells: 12
-- active_upsells: 11 (combo_bundle is inactive)
-- static_upsells: 4 (equipment, food, beverage, lesson)
-- conditional_upsells: 8

-- View all upsells grouped by category
SELECT
  category,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active,
  SUM(price) as total_value
FROM upsells
GROUP BY category
ORDER BY category;

-- View conditional upsells with their trigger conditions
SELECT
  name,
  price,
  category,
  trigger_condition,
  is_active
FROM upsells
WHERE trigger_condition IS NOT NULL
ORDER BY category, name;
