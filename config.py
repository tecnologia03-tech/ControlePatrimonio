# config.py
# Carrega as variáveis de ambiente do arquivo .env
from dotenv import load_dotenv
import os

# Lê a URL de conexão com o banco de dados PostgreSQL
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")