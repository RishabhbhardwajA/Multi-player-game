# PixelClash

A real-time shared grid game built with the MERN stack and Socket.IO.

I built this app to see how well I could handle real-time state syncing across multiple clients without the server melting down. The premise is simple: it's a 50x50 grid (2,500 tiles) where anyone online can click a tile to claim it with their specific color. Every other player sees the update instantly.

## How it works

The app uses **Socket.IO** over standard WebSockets because the built-in auto-reconnection and event-based API made handling dropped connections much easier.

When a user connects, the server assigns them a random name (like "CosmicFox42") and a neon color. There's no heavy auth flow—you just open the page and start playing. 

If you click a tile:
1. The client sends a claim event to the server.
2. The server checks a few things: Are you on cooldown? Are the coordinates valid?
3. If everything is good, it updates an in-memory map.
4. It immediately broadcasts the change to everyone connected.

## technical decisions

### 1. Canvas over DOM for the Grid
Initially, a grid of `div`s sounds easy, but rendering 2,500 DOM nodes and updating their styles in real-time caused massive layout thrashing and lag. I rewrote the frontend grid using an HTML5 `<canvas>`. Now, it renders smoothly at 60fps, and I was even able to add custom zooming, panning, and ripple animations without dropping frames.

### 2. Solving Race Conditions
If two people click the exact same tile at the exact same millisecond, who gets it? Node.js runs on a single-threaded event loop, which actually solves this for us perfectly. The Socket events are processed sequentially. The last event processed simply overwrites the tile. No complex locking was needed.

### 3. Database Debouncing
I used MongoDB to persist the grid state so the canvas doesn't reset if the server restarts. However, writing to the database on every single tile claim would be a major bottleneck if 50 people are playing. Instead, the server updates an in-memory Map instantly for speed, and uses a debounced save to batch write the state to MongoDB every 2 seconds.

### 4. Architecture & Error Handling
I set up the backend using a clean MVC structure with a custom `AppError` class and a `catchAsync` wrapper. This means if something fails (like a database connection issue or a malformed socket payload), it doesn't crash the Node server. Instead, it gracefully emits an error back to the specific client.

### 5. Why Dark Mode? (Color Philosophy)
Since the entire core loop of the game is about visual territory control, the UI needed to support that. I went with a deep, dark navy background specifically because high-contrast neon colors (like cyan, hot pink, and electric violet) pop much better against dark surfaces. A white background would have washed out the colors and made the grid look messy. The dark theme with glassmorphism keeps the focus exactly where it should be: on the brightly colored tiles.

## Running the app locally

You'll need Node.js and MongoDB running (locally or an Atlas cluster).

1. Clone this repo.
2. Run `npm run install-all` from the root folder to install dependencies for both the frontend and backend.
3. Create a `.env` file in the `server` folder (you can copy `.env.example`) and add your MongoDB URI.
4. From the root folder, just run:

```bash
npm run dev
```

This uses `concurrently` to boot up both the Vite frontend (port 5173) and the Express backend (port 3001) at the same time. Open up `http://localhost:5173` in a few tabs and test it out!
