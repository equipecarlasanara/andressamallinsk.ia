import httpx
import os
import logging
from typing import List, Optional, Any, Dict

logger = logging.getLogger(__name__)

class D1Client:
    _client = None

    def __init__(self):
        self.account_id = os.environ.get('CLOUDFLARE_ACCOUNT_ID')
        self.database_id = os.environ.get('CLOUDFLARE_DATABASE_ID')
        self.api_token = os.environ.get('CLOUDFLARE_API_TOKEN')
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
        
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

    @classmethod
    def get_client(cls):
        if cls._client is None:
            cls._client = httpx.AsyncClient(timeout=20.0, limits=httpx.Limits(max_connections=100, max_keepalive_connections=50))
        return cls._client

    async def _query(self, sql: str, params: List[Any] = None) -> List[Dict[str, Any]]:
        client = self.get_client()
        payload = {"sql": sql, "params": params or []}
        response = await client.post(self.base_url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                logger.error(f"Erro na D1 API: {response.text}")
                raise Exception(f"D1 API Error: {response.status_code}")
            
            data = response.json()
            if not data.get("success"):
                logger.error(f"D1 Query Failed: {data.get('errors')}")
                raise Exception(f"D1 Query Failed: {data.get('errors')}")
            
            # O D1 retorna resultados em data['result'][0]['results']
            results = data.get("result", [])
            if results and "results" in results[0]:
                return results[0]["results"]
            return []

    async def insert_one(self, table: str, data: Dict[str, Any]):
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["?" for _ in data])
        sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        await self._query(sql, list(data.values()))

    async def find_one(self, table: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        where_clauses = []
        params = []
        for k, v in query.items():
            if isinstance(v, dict):
                if "$ne" in v:
                    if v["$ne"] is None:
                        where_clauses.append(f"{k} IS NOT NULL")
                    else:
                        where_clauses.append(f"{k} != ?")
                        params.append(v["$ne"])
            else:
                where_clauses.append(f"{k} = ?")
                params.append(v)
                
        sql = f"SELECT * FROM {table}"
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)
        sql += " LIMIT 1"
        
        results = await self._query(sql, params)
        return results[0] if results else None

    async def find_many(self, table: str, query: Dict[str, Any] = None, limit: int = 100) -> List[Dict[str, Any]]:
        sql = f"SELECT * FROM {table}"
        params = []
        if query:
            where_clauses = []
            for k, v in query.items():
                if isinstance(v, dict):
                    if "$ne" in v:
                        if v["$ne"] is None:
                            where_clauses.append(f"{k} IS NOT NULL")
                        else:
                            where_clauses.append(f"{k} != ?")
                            params.append(v["$ne"])
                else:
                    where_clauses.append(f"{k} = ?")
                    params.append(v)
            
            if where_clauses:
                sql += " WHERE " + " AND ".join(where_clauses)
        
        sql += f" LIMIT {limit}"
        return await self._query(sql, params)

    async def update_one(self, table: str, query: Dict[str, Any], update: Dict[str, Any]):
        # Note: update here is expected to be simple key-value pairs (not $set)
        set_clauses = [f"{k} = ?" for k in update.keys()]
        where_clauses = [f"{k} = ?" for k in query.keys()]
        
        sql = f"UPDATE {table} SET {', '.join(set_clauses)} WHERE {' AND '.join(where_clauses)}"
        params = list(update.values()) + list(query.values())
        
        await self._query(sql, params)

    async def delete_one(self, table: str, query: Dict[str, Any]):
        where_clauses = [f"{k} = ?" for k in query.keys()]
        sql = f"DELETE FROM {table} WHERE {' AND '.join(where_clauses)}"
        await self._query(sql, list(query.values()))

    # Adaptadores para o código atual do server.py
    @property
    def users(self): return TableProxy(self, "users")
    @property
    def goals(self): return TableProxy(self, "goals")
    @property
    def weekly_actions(self): return TableProxy(self, "weekly_actions")
    @property
    def leads(self): return TableProxy(self, "leads")
    @property
    def content_items(self): return TableProxy(self, "content_items")

class TableProxy:
    def __init__(self, client: D1Client, table_name: str):
        self.client = client
        self.table_name = table_name

    async def insert_one(self, data: Dict[str, Any]):
        return await self.client.insert_one(self.table_name, data)

    async def find_one(self, query: Dict[str, Any], projection: Dict[str, Any] = None):
        # Projection is ignored in this simple D1 proxy
        return await self.client.find_one(self.table_name, query)

    def find(self, query: Dict[str, Any], projection: Dict[str, Any] = None):
        return CursorProxy(self.client, self.table_name, query)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        # Extract $set if present
        if "$set" in update:
            update_data = update["$set"]
        else:
            update_data = update
        return await self.client.update_one(self.table_name, query, update_data)

    async def delete_one(self, query: Dict[str, Any]):
        return await self.client.delete_one(self.table_name, query)

class CursorProxy:
    def __init__(self, client: D1Client, table_name: str, query: Dict[str, Any]):
        self.client = client
        self.table_name = table_name
        self.query = query

    async def to_list(self, length: int):
        return await self.client.find_many(self.table_name, self.query, limit=length)
