import uvicorn
import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"============================================================")
    print(f" ONEHEALTH AI - Mobile-First Offline-First Healthcare PWA")
    print(f" Server running at: http://localhost:{port}")
    print(f" Open in any mobile browser or desktop browser")
    print(f"============================================================")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
