CREATE TABLE landing_settings (
  id INT PRIMARY KEY DEFAULT 1,
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  provider_hero_title TEXT NOT NULL,
  provider_hero_subtitle TEXT NOT NULL,
  pricing_amount INT NOT NULL DEFAULT 799,
  promo_text TEXT,
  toggles JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO landing_settings (id, hero_title, hero_subtitle, provider_hero_title, provider_hero_subtitle, pricing_amount, promo_text, toggles)
VALUES (
  1,
  'Your Premier Partner in Women''s Health',
  'Empowering women through comprehensive, compassionate, and cutting-edge medical care. Book consultations instantly.',
  'Empower Your Practice with HealNari',
  'Join the leading digital platform for women''s endocrinology and reproductive health. Focus on what you do best—delivering world-class clinical outcomes—while our AI EMR and automated patient acquisition handles the rest.',
  799,
  'Use code HEALTH20 for 20% off your first consultation!',
  '{"showEmergencyBanner": false, "showFeaturedDoctors": true, "showTestimonials": true, "showPricing": false, "showNewsletter": true, "showProviderTestimonials": true, "showProviderCalculator": true, "showProviderComparison": true}'
);
