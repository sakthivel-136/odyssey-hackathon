import threading
import time
import logging
import httpx
from postgrest._sync import request_builder
from supabase import create_client, Client, ClientOptions
from core.config import settings

logger = logging.getLogger(__name__)

# Patch postgrest send_with_retry to automatically retry on transient network/socket errors
# like Errno 11 Resource temporarily unavailable, socket drops, and keep-alive resets
_orig_send_with_retry = request_builder.send_with_retry

def _resilient_send_with_retry(req):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return _orig_send_with_retry(req)
        except (httpx.ReadError, httpx.ConnectError, httpx.RemoteProtocolError, httpx.TimeoutException) as exc:
            if attempt == max_retries - 1:
                logger.error(f"Postgrest request failed after {max_retries} attempts: {exc}")
                raise
            logger.warning(f"Transient {type(exc).__name__} on Postgrest query. Retrying ({attempt + 1}/{max_retries})...")
            time.sleep(0.25 * (attempt + 1))

request_builder.send_with_retry = _resilient_send_with_retry

# Thread-local storage to prevent socket contention across anyio worker threads
_thread_local = threading.local()

def _create_fresh_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the environment.")
    
    options = ClientOptions(postgrest_client_timeout=25)
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY, options=options)

def get_supabase() -> Client:
    """
    Returns a thread-isolated Supabase client instance.
    Prevents cross-thread httpx socket sharing and 'Resource temporarily unavailable' errors.
    """
    if not hasattr(_thread_local, "client") or _thread_local.client is None:
        _thread_local.client = _create_fresh_client()
    return _thread_local.client

def reset_supabase():
    """Forces recreation of thread-local client if connection is stale."""
    if hasattr(_thread_local, "client"):
        _thread_local.client = None
