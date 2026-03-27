from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from rembg import remove
import io
import time
import uvicorn

app = FastAPI()

print("[REMBG-SERVER] Starting up and loading model into memory...")
# Run a dummy image through to warm up the model
try:
    dummy_img = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDAT\x08\x99c\xf8\x0f\x04\x00\x09\xfb\x03\xfd\xe3\x55\xf2\x9c\x00\x00\x00\x00IEND\xaeB`\x82"
    remove(dummy_img)
    print("[REMBG-SERVER] ✅ Model loaded successfully.")
except Exception as e:
    print(f"[REMBG-SERVER] Warning during warmup: {e}")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/remove-bg")
async def remove_background(request: Request):
    start_time = time.time()
    try:
        input_data = await request.body()
        
        # Remove background
        # rembg automatically uses the loaded model in memory
        output_data = remove(input_data)
        
        elapsed = round(time.time() - start_time, 2)
        print(f"[REMBG-SERVER] Processed image in {elapsed}s")
        
        return Response(content=output_data, media_type="image/png")
    except Exception as e:
        print(f"[REMBG-SERVER] ❌ Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)
