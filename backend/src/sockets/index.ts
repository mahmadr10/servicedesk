import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyToken } from "../utils/jwt";
import { env } from "../config/env";
import { setIO } from "./io";

// Socket.IO layers a persistent, two-way connection on top of a normal HTTP
// server — this is what lets the SERVER push data to the browser (a normal
// REST API can only respond when the browser asks). We use it for exactly
// one thing here: telling a customer's open browser tab "your ticket just
// changed" the instant an agent updates it.
export function initSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_ORIGIN },
  });

  // Socket.IO "middleware" — same idea as Express middleware, runs before a
  // connection is accepted. We reuse the SAME JWT the REST API uses, sent
  // once at connection time (not on every message), so a socket can't be
  // opened by someone who isn't logged in.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Missing auth token"));
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Every socket automatically joins a "room" named after its user. Rooms
    // are Socket.IO's built-in grouping — emitting "to" a room reaches every
    // socket that joined it (e.g. the same user open in two browser tabs),
    // and nobody else. We never need to manually target individual sockets.
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      // Socket.IO removes the socket from all rooms automatically on
      // disconnect — nothing for us to clean up here. If the same user
      // reconnects (e.g. page refresh), a NEW socket joins the room fresh,
      // so there's no risk of a "ghost" duplicate listener building up.
    });
  });

  setIO(io);
  return io;
}
