import { BACKEND_ADDRESS } from "./constants";
import { authFetch } from "./auth";

export function playClickSound() {
  new Audio("click_creatorassets.com.mp3").play();
}

export const socket = {
  // This is a wrapper functionm and not the actual socket instance [rather its ref].
  // Due to time constrains i was unable to implement a proper redux-based solution
  emit: (...args) => {
    if (window.socket) {
      window.socket.emit(...args);
    } else throw Error("Socket's Window wrapper is having some issue!")
  },
  on: (...args) => {
    if (window.socket) {
      window.socket.on(...args);
    } else throw Error("Socket's Window wrapper is having some issue!")
  }
}

export async function addStamp(ticketId, type) {
  const res = await authFetch(`${BACKEND_ADDRESS}/add-stamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId, type }),
  });
  const stamp = await res.json();
  socket.emit("user:ticket-stamped", { ticketId, stamp });
  return stamp;
}

export async function removeStamp(ticketId, stampId) {
  await authFetch(`${BACKEND_ADDRESS}/remove-stamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId, stampId }),
  });
  socket.emit("user:ticket-unstamped", { ticketId, stampId });
}