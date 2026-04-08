import os

# ---------------------------------------------------------------------------
# Credentials — change these to update login details
# ---------------------------------------------------------------------------

USER_USERNAME = "sales"
USER_PASSWORD = "sales2026"

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin2026"

# Flask session secret — loaded from environment (set as a secret in Replit)
SECRET_KEY = os.environ.get("SESSION_SECRET", "change-me-in-production")
