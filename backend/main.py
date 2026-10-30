import os, time, secrets, asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path


UPLOAD_DIR = Path("uploads")
FRONTEND_DIR = Path("frontend")
UPLOAD_DIR.mkdir(exist_ok=True)


active_sessions = {}
file_registry = {} # {session_id: {"path": Path, "used": bool}}

SESSION_TIMEOUT = 600  # 10 minutes
FILE_MAX_AGE = 3600    # 1 hour

async def cleanup_task():
    while True:
        try:
            now = time.time()
            # Clean files 
            for file_path in UPLOAD_DIR.glob("*.jpg"):
                if now - file_path.stat().st_mtime > FILE_MAX_AGE:
                    file_path.unlink(missing_ok=True)
                    print(f"Cleanup: Poistettu vanha tiedosto {file_path.name}")
            
            # remove expired sessions
            expired_sessions = [uid for uid, created in active_sessions.items() 
                                if now - created > SESSION_TIMEOUT]
            for uid in expired_sessions:
                del active_sessions[uid]
         
                if uid in file_registry:
                    del file_registry[uid]
        except Exception as e:
            print(f"Cleanup error: {e}")
            
        await asyncio.sleep(600) 

@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_loop = asyncio.create_task(cleanup_task())
    print("Lifespan: Cleaning started")
    yield
    cleanup_loop.cancel()
    print("Lifespan: Cleaning stopped")

app = FastAPI(lifespan=lifespan)

@app.get("/api/new-session")
async def create_session():

    new_id = secrets.token_urlsafe(6) 
    while new_id in active_sessions:
        new_id = secrets.token_urlsafe(6)
    active_sessions[new_id] = time.time()
    print(f"Server: new session created {new_id}. Active: {len(active_sessions)}")
    return {"uuid": new_id}

@app.post("/api/upload/{session_id}")
async def upload_file(session_id: str, file: UploadFile = File(...)):
    # Debug-tuloste:
    print(f"Server: Upload {session_id}")
    
    if session_id not in active_sessions:
        print(f"Server: 403 hylätty! ID {session_id} ei löydy.")
        raise HTTPException(status_code=403, detail="Session invalid or expired")
    
    file_path = UPLOAD_DIR / f"{session_id}.jpg"
    
    # Luetaan ja tallennetaan tiedosto
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    file_registry[session_id] = {
        "path": file_path,
        "used": False
    }
    return {"status": "ok"}

@app.get("/api/status/{session_id}")
async def check_status(session_id: str):
    if session_id in file_registry and not file_registry[session_id]["used"]:
        return {"ready": True}
    return {"ready": False}

@app.get("/api/download/{session_id}")
async def download_file(session_id: str, background_tasks: BackgroundTasks):
    data = file_registry.get(session_id)
    if not data or data["used"]:
        raise HTTPException(status_code=404, detail="File not found or already used")
    
    data["used"] = True
   
    background_tasks.add_task(lambda p: Path(p).unlink(missing_ok=True), data["path"])
    return FileResponse(data["path"])

if FRONTEND_DIR.exists():

    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")
    
    @app.get("/c/{session_id}")
    async def serve_capture_page(session_id: str):
        return FileResponse(FRONTEND_DIR / "index.html")
        
    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")