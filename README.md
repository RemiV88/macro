# Macro

Calorie and macro tracker.

## Stack

- **Frontend** (`/client`): React + Vite + React Router + axios
- **Backend** (`/server`): Express + Mongoose
- **Database**: MongoDB Atlas
- **Auth**: JWT + bcryptjs (planned)
- **Image hosting**: Cloudinary (planned)
- **Food data**: USDA FoodData Central API (planned)
- **Deployment**: Netlify (frontend) + Render (backend) (planned)

## Local development

### One-time setup

```bash
# install client deps
cd client && npm install

# install server deps
cd ../server && npm install

# fill in your MongoDB Atlas connection string
cp .env.example .env   # then edit .env
```

### Run both servers

In two terminals from the project root:

```bash
# terminal 1 — backend on http://localhost:5001
cd server && npm run dev

# terminal 2 — frontend on http://localhost:5173
cd client && npm run dev
```

The home page (`/`) calls `GET /api/health` to confirm the frontend ↔ backend ↔ MongoDB chain is wired up.
