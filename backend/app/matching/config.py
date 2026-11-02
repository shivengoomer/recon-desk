"""All matching thresholds in one place (tolerance itself lives in app_settings so the co-founder can change it)."""
DEFAULT_TOLERANCE_INR = 10
SUGGESTION_MIN_SCORE = 0.5
SUGGESTION_MAX_LINES_PER_RUN = 2000
SUGGESTION_CANDIDATES_PER_LINE = 3
SUGGESTION_WINDOW_DAYS = 30
SCORE_WEIGHTS = {"amount": 0.55, "date": 0.30, "reference": 0.15}
