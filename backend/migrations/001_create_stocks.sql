CREATE TABLE IF NOT EXISTS stocks (
    id         SERIAL PRIMARY KEY,
    ticker     VARCHAR(20)  UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL,
    sector     VARCHAR(100),
    industry   VARCHAR(100),
    exchange   VARCHAR(20)  NOT NULL DEFAULT 'IST',
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stocks_sector   ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_stocks_industry ON stocks(industry);
