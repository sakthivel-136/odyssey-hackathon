with open("backend/main.py", "r") as f:
    content = f.read()

if "from test_twilio_route import router" not in content:
    content = content.replace('app = FastAPI(title="Smart Medibox API", lifespan=lifespan)', 'app = FastAPI(title="Smart Medibox API", lifespan=lifespan)\nfrom test_twilio_route import router as twilio_router\napp.include_router(twilio_router)')

with open("backend/main.py", "w") as f:
    f.write(content)
