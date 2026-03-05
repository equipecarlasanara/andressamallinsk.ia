import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

print(f"EMERGENT_LLM_KEY exists: {'Yes' if os.environ.get('EMERGENT_LLM_KEY') else 'No'}")
print(f"DB_TYPE: {os.environ.get('DB_TYPE')}")
print(f"JWT_SECRET exists: {'Yes' if os.environ.get('JWT_SECRET') else 'No'}")
