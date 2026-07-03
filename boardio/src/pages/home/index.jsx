import React, { useEffect, useRef, useState } from "react";
import SocketUser from "../../utils/connections";
import { playClickSound, removeStamp } from "../../utils/utility";
import "./index.css";
import { v4 } from "uuid";
import { io } from "socket.io-client";
import { BACKEND_ADDRESS, COLORS, MALE_NAMES, STAMP_TYPES } from "../../utils/constants";

function formatTicketDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const Home = ({
  todos: todosVal,
  handleOpenTicketModal,
  showToast,
  boardName,
  columns,
  handleUpdateBoardName,
  handleCreateColumn,
  handleDeleteColumn,
  handleReorderColumns,
}) => {

  const [currentId, setCurrentId] = useState([]);
  const [currentColor, setCurrentColor] = useState("");
  const [currentName, setCurrentName] = useState("");

  const [todos, setTodos] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [draggedColumnId, setDraggedColumnId] = useState(null);
  const [lightboxAttachment, setLightboxAttachment] = useState(null);
  const [ticketImageIndices, setTicketImageIndices] = useState({});

  const [draggingTicketId, setDraggingTicketId] = useState(null);
  const [dragGhost, setDragGhost] = useState(null);
  const suppressClickRef = useRef(false);

  function startTicketDrag(ev, todo) {
    if (ev.button !== 0) return;
    const cardEl = ev.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    const dragState = {
      todo,
      startX: ev.clientX,
      startY: ev.clientY,
      offsetX: ev.clientX - rect.left,
      offsetY: ev.clientY - rect.top,
      width: rect.width,
      dragging: false,
      lastX: ev.clientX,
      lastTime: Date.now(),
    };

    function handleMouseMove(moveEv) {
      const dx = moveEv.clientX - dragState.startX;
      const dy = moveEv.clientY - dragState.startY;
      if (!dragState.dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragState.dragging = true;
        setDraggingTicketId(todo._id);
      }
      if (dragState.dragging) {
        const now = Date.now();
        const dt = Math.max(now - dragState.lastTime, 1);
        const velocity = (moveEv.clientX - dragState.lastX) / dt;
        dragState.lastX = moveEv.clientX;
        dragState.lastTime = now;
        setDragGhost({
          x: moveEv.clientX - dragState.offsetX,
          y: moveEv.clientY - dragState.offsetY,
          width: dragState.width,
          rotation: Math.max(-18, Math.min(18, velocity * 30)),
          todo,
        });
      }
    }

    function handleMouseUp(upEv) {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (dragState.dragging) {
        const targetEl = document.elementFromPoint(upEv.clientX, upEv.clientY);
        const ticketEl = targetEl && targetEl.closest("[data-ticket-id]");
        const columnEl = targetEl && targetEl.closest("[data-column-id]");
        const targetTicketId = ticketEl ? Number(ticketEl.getAttribute("data-ticket-id")) : null;

        if (targetTicketId && targetTicketId !== todo._id) {
          const ticketRect = ticketEl.getBoundingClientRect();
          const insertBefore = upEv.clientY < ticketRect.top + ticketRect.height / 2;
          reorderTicketInColumn(todo._id, targetTicketId, insertBefore);
        } else if (columnEl) {
          moveTicketToColumn(todo._id, Number(columnEl.getAttribute("data-column-id")));
        }
        suppressClickRef.current = true;
      }
      setDraggingTicketId(null);
      setDragGhost(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function moveColumnBeforeTarget(draggedId, targetId) {
    if (draggedId == null || draggedId === targetId) return;
    const columnIds = columns.map((column) => column._id);
    const fromIndex = columnIds.indexOf(draggedId);
    const toIndex = columnIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    columnIds.splice(fromIndex, 1);
    columnIds.splice(toIndex, 0, draggedId);
    handleReorderColumns(columnIds);
  }

  function moveTicketToColumn(ticketId, columnId) {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id == ticketId ? { ...todo, columnId } : todo
      )
    );
    fetch(BACKEND_ADDRESS + "/move-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, columnId }),
    });
    socket.emit("user:ticket-moved", { ticketId, columnId });
  }

  function reorderTicketInColumn(draggedId, targetTicketId, insertBefore) {
    setTodos((prevTodos) => {
      const columnId = prevTodos.find((t) => t._id === draggedId)?.columnId;
      const columnTickets = prevTodos
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a._id - b._id);
      const withoutDragged = columnTickets.filter((t) => t._id !== draggedId);
      const targetIndex = withoutDragged.findIndex((t) => t._id === targetTicketId);
      withoutDragged.splice(insertBefore ? targetIndex : targetIndex + 1, 0, columnTickets.find((t) => t._id === draggedId));
      const ticketIds = withoutDragged.map((t) => t._id);
      fetch(BACKEND_ADDRESS + "/reorder-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds }),
      });
      socket.emit("user:tickets-reordered", { ticketIds });
      return prevTodos.map((t) => {
        const idx = ticketIds.indexOf(t._id);
        return idx !== -1 ? { ...t, order: idx } : t;
      });
    });
  }

  useEffect(() => {
    setBoardNameDraft(boardName);
  }, [boardName]);

  function saveBoardName() {
    const name = boardNameDraft.trim();
    if (name && name !== boardName) {
      handleUpdateBoardName(name);
    } else {
      setBoardNameDraft(boardName);
    }
    setIsEditingBoardName(false);
  }

  function submitNewColumn() {
    const name = newColumnName.trim();
    if (name) {
      handleCreateColumn(name);
    }
    setNewColumnName("");
    setIsAddingColumn(false);
  }
  useEffect(() => {
    const socketIoConnection = io("http://192.168.0.107:8001");
    setSocket(socketIoConnection);
    window.socket = socketIoConnection;

    setCurrentId(v4());
    setCurrentColor(COLORS[Math.trunc(Math.random() * COLORS.length)]);
    setCurrentName(MALE_NAMES[Math.trunc(Math.random() * MALE_NAMES.length)]);
  }, []);

  useEffect(() => {
    setTodos(todosVal);
  }, [todosVal])

  function createNameTag({ id, color, name, nameTagRef, isHidden }) {
    return (
      <div
        style={{ opacity: isHidden ? "0" : "1" }}
        className="absolute z-50"
        ref={nameTagRef}
      >
        <svg
          className="shaodow-90s-btn"
          width="17"
          height="18"
          viewBox="0 0 17 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.503 5.97C16.707 6.459 16.615 8.194 15.366 8.553L9.06097 10.366L6.18097 16.261C5.60997 17.429 3.88497 17.218 3.61197 15.947L0.676975 2.257C0.624526 2.01366 0.639415 1.76063 0.72004 1.52513C0.800665 1.28963 0.943974 1.08056 1.13455 0.920429C1.32513 0.760295 1.55576 0.655152 1.80163 0.616313C2.04751 0.577473 2.29932 0.606405 2.52997 0.699998L15.503 5.97Z"
            fill={color}
            stroke="#126262"
          />
        </svg>
        <div
          id={id}
          style={{ backgroundColor: color }}
          className={`px-2 py-1 bg-${color}-400 ml-4 text-white shadow-90s-btn border-retro-green border-[0.05px] text-xs`}
        >
          {name}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (socket && window.location.pathname == "/home") {
      socket.emit("user:join", {
        color: currentColor,
        name: currentName,
        id: currentId,
      });

      // Changes the positions of other user's nametag.
      socket.on("user:mouse-move", (id, mousePosition) => {
        setRoomUsers((prevUsers) =>
          prevUsers.map((user) => {
            if (user.id == id) user.moveNameTag(mousePosition);
            return user;
          })
        );
      });

      // When user enters hovering a ticket!
      socket.on("user:entered-hovering-ticket", ({ id }) =>
        setTodos(
          todos.map((todo) => {
            if (Number(todo._id) != Number(id)) return todo;
            todo.isBeingHovered = true;
            return todo;
          })
        )
      );

      // When user leaves hovering a ticket!
      socket.on("user:left-hovering-ticket", ({ id }) =>
        setTodos(
          todos.map((todo) => {
            if (Number(todo._id) != Number(id)) return todo;
            todo.isBeingHovered = false;
            return todo;
          })
        )
      );

      // Runs when you join to tell you about others that are in the room!!
      socket.on("user:introduce-others", ({ connectedUsers }) => {
        connectedUsers.map(({ id, color, name }) => {
          const socketUser = new SocketUser({ id, color, name, showToast });
          socketUser.nameTagRef = React.createRef();
          setRoomUsers((prevUsers) => [...prevUsers, socketUser]);
        });
      });

      // Runs when a new user joins.
      socket.on("user:join", ({ id, color, name }) => {
        debugger;
        const socketUser = new SocketUser({ id, color, name, showToast });
        socketUser.nameTagRef = React.createRef();
        setRoomUsers((prevUsers) => [...prevUsers, socketUser]);
      });

      // When user leaves the room!
      socket.on("user:left", ({ id }) =>
        setRoomUsers((prevUsers) =>
          prevUsers.filter((user) => {
            if (user.id != id) return true;
            user.removeNameTag();
            return false;
          })
        )
      );

      socket.on("user:ticket-opened", ({ ticketId, clickedBy }) => {
        setTodos(
          todos.map((todo) => {
            if (todo._id != ticketId) return todo;
            todo.hasBeenClicked = true;
            todo.clickedBy = {
              id: clickedBy.id,
              color: clickedBy.color
            }
            return todo;
          })
        );
        setRoomUsers((prevUsers) =>
          prevUsers.filter((user) => {
            if (user.id != clickedBy) return true;
            user.dissolveNameTag();
            return false;
          })
        );
      });

      socket.on("user:ticket-closed", ({ ticketId, clickedBy }) => {
        setTodos(
          todos.map((todo) => {
            if (todo._id != ticketId) return todo;
            todo.hasBeenClicked = false;
            todo.clickedBy = {};
            return todo;
          })
        );
        setRoomUsers((prevUsers) =>
          prevUsers.filter((user) => {
            if (user.id != clickedBy) return true;
            user.resolveNameTag();
            return false;
          })
        );
      });

      socket.on("user:ticket-moved", ({ ticketId, columnId }) => {
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id == ticketId ? { ...todo, columnId } : todo
          )
        );
      });

      socket.on("user:ticket-stamped", ({ ticketId, stamp }) => {
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id == ticketId
              ? { ...todo, stamps: [...(todo.stamps || []), stamp] }
              : todo
          )
        );
      });

      socket.on("user:ticket-unstamped", ({ ticketId, stampId }) => {
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id == ticketId
              ? { ...todo, stamps: (todo.stamps || []).filter((stamp) => stamp._id !== stampId) }
              : todo
          )
        );
      });

      socket.on("user:tickets-reordered", ({ ticketIds }) => {
        setTodos((prevTodos) =>
          prevTodos.map((todo) => {
            const idx = ticketIds.indexOf(todo._id);
            return idx !== -1 ? { ...todo, order: idx } : todo;
          })
        );
      });

      // Handle mouse move.
      window.addEventListener("mousemove", ({ clientX, clientY }) => {
        socket.emit("user:mouse-move", currentId, { clientX, clientY });
      });

      // Emit leaving event before closing.
      window.addEventListener("beforeunload", () =>
        socket.emit("user:left", { id: currentId })
      );

      return () => {
        socket.emit("user:left", { id: currentId });
        socket.disconnect();
      };
    }
  }, [socket]);

  return (
    <section>
      {roomUsers.map((user) => createNameTag(user))}
      <div className="absolute my-14 ml-12">
        <div className="mb-6 w-fit">
          {isEditingBoardName ? (
            <input
              autoFocus
              className="text-3xl font-black retro-green border-[0.5px] border-retro-green shadow-90s-input px-2 py-1 bg-white"
              value={boardNameDraft}
              onChange={(ev) => setBoardNameDraft(ev.target.value)}
              onBlur={saveBoardName}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") saveBoardName();
                if (ev.key === "Escape") {
                  setBoardNameDraft(boardName);
                  setIsEditingBoardName(false);
                }
              }}
            />
          ) : (
            <div
              className="text-3xl font-black retro-green border-[0.5px] border-retro-green shadow-90s bg-white px-4 py-2 w-fit cursor-pointer"
              title="Click to rename board"
              onClick={() => {
                playClickSound();
                setIsEditingBoardName(true);
              }}
            >
              {boardName || "Untitled Board"}
            </div>
          )}
        </div>
        <div className="flex flex-row flex-wrap items-start gap-6">
          {columns.map((column) => {
            const columnTodos = todos
              .filter((todo) => todo.columnId === column._id)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a._id - b._id);
            return (
              <div
                key={column._id}
                data-column-id={column._id}
                className={`border-[0.5px] border-retro-green shadow-90s bg-white p-6 w-64 box-border ${
                  draggedColumnId === column._id ? "opacity-50" : ""
                }`}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={(ev) => {
                  ev.preventDefault();
                  if (draggedColumnId != null) {
                    moveColumnBeforeTarget(draggedColumnId, column._id);
                    setDraggedColumnId(null);
                  }
                }}
              >
                <div
                  draggable
                  onDragStart={() => setDraggedColumnId(column._id)}
                  onDragEnd={() => setDraggedColumnId(null)}
                  className="flex justify-between items-center cursor-grab"
                  title="Drag to reorder column"
                >
                  <div className="text-3xl font-black retro-green">{column.name}</div>
                  <div
                    className="retro-green text-xl font-black px-2 cursor-pointer"
                    title="Delete column"
                    onClick={() => {
                      playClickSound();
                      handleDeleteColumn(column._id);
                    }}
                  >
                    &times;
                  </div>
                </div>
                <br />
                <hr />
                {columnTodos.map((todo) => {
                  const mediaAttachments = (todo.attachments || []).filter(
                    (attachment) => attachment.type === "image" || attachment.type === "video"
                  );
                  const imageIndex = Math.min(
                    ticketImageIndices[todo._id] || 0,
                    Math.max(mediaAttachments.length - 1, 0)
                  );
                  return (
                    <div
                      key={todo._id}
                      id={todo._id}
                      data-ticket-id={todo._id}
                      className={`relative border-[0.5px] border-retro-green retro-green p-2 ${
                        todo.isBeingHovered ? "shadow-90s-btn-hover" : "shadow-90s-btn"
                      } w-full mt-4 cursor-grab ${
                        todo.hasBeenClicked ? 'bg-' + todo.clickedBy.color + '-400' : ""
                      } ${draggingTicketId === todo._id ? "opacity-30" : ""}`}
                      onMouseDown={(ev) => startTicketDrag(ev, todo)}
                      onMouseEnter={(ev) =>
                        socket.emit("user:entered-hovering-ticket", {
                          id: ev.target.id,
                        })
                      }
                      onMouseLeave={(ev) =>
                        socket.emit("user:left-hovering-ticket", { id: ev.target.id })
                      }
                      onClick={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false;
                          return;
                        }
                        playClickSound();
                        handleOpenTicketModal(todo._id, "Update");
                        socket.emit("user:ticket-opened", {
                          ticketId: todo._id,
                          clickedBy: {
                            id: currentId,
                            color: currentColor,
                          },
                        });
                      }}
                    >
                      {(todo.stamps || []).length > 0 && (
                        <div className="absolute -top-3 -right-3 flex flex-wrap gap-1 justify-end max-w-[90%] z-10">
                          {todo.stamps.map((stamp) => {
                            const stampType =
                              STAMP_TYPES.find((s) => s.type === stamp.type) || {};
                            return (
                              <div
                                key={stamp._id}
                                className="px-2 py-1 text-xs font-black text-white border-[0.5px] border-retro-green shadow-90s-btn cursor-pointer whitespace-nowrap"
                                style={{
                                  backgroundColor: stampType.color,
                                  transform: `rotate(${stamp.rotation}deg)`,
                                }}
                                title="Click to remove this stamp"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  playClickSound();
                                  setTodos((prevTodos) =>
                                    prevTodos.map((t) =>
                                      t._id == todo._id
                                        ? {
                                            ...t,
                                            stamps: t.stamps.filter((s) => s._id !== stamp._id),
                                          }
                                        : t
                                    )
                                  );
                                  removeStamp(todo._id, stamp._id);
                                }}
                              >
                                {stampType.emoji} {stampType.label}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {mediaAttachments.length > 0 && (
                        <div className="relative mb-2">
                          {mediaAttachments[imageIndex].type === "video" ? (
                            <video
                              src={BACKEND_ADDRESS + mediaAttachments[imageIndex].url}
                              className="w-full max-h-32 object-cover border-[0.5px] border-retro-green cursor-pointer"
                              autoPlay
                              loop
                              muted
                              playsInline
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setLightboxAttachment(mediaAttachments[imageIndex]);
                              }}
                            />
                          ) : (
                            <img
                              src={BACKEND_ADDRESS + mediaAttachments[imageIndex].url}
                              alt={todo.title}
                              className="w-full max-h-32 object-cover border-[0.5px] border-retro-green cursor-pointer"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setLightboxAttachment(mediaAttachments[imageIndex]);
                              }}
                            />
                          )}
                          {mediaAttachments.length > 1 && (
                            <>
                              <div
                                className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white bg-opacity-80 text-sm font-black border-[0.5px] border-retro-green cursor-pointer"
                                title="Previous attachment"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setTicketImageIndices((prev) => ({
                                    ...prev,
                                    [todo._id]:
                                      (imageIndex - 1 + mediaAttachments.length) % mediaAttachments.length,
                                  }));
                                }}
                              >
                                &lsaquo;
                              </div>
                              <div
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white bg-opacity-80 text-sm font-black border-[0.5px] border-retro-green cursor-pointer"
                                title="Next attachment"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setTicketImageIndices((prev) => ({
                                    ...prev,
                                    [todo._id]: (imageIndex + 1) % mediaAttachments.length,
                                  }));
                                }}
                              >
                                &rsaquo;
                              </div>
                              <div className="absolute bottom-1 right-1 px-1 bg-white bg-opacity-80 text-[10px] border-[0.5px] border-retro-green">
                                {imageIndex + 1}/{mediaAttachments.length}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <div className="mb-2 font-black line-clamp-4">{todo.title}</div>
                      <div className="text-xs line-clamp-6">{todo.description}</div>
                      {formatTicketDate(todo.createdAt) && (
                        <div className="text-xs font-black mt-2 text-right">
                          {formatTicketDate(todo.createdAt)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {columnTodos.length == 0 && (
                  <div className="retro-green text-xs">
                    <br />
                    List down your important tasks, i.e. Go fishing, Repair Hamza's
                    typewriter In Shaa Allah etc..
                  </div>
                )}
                <div
                  className="w-full shadow-90s-btn mt-4 py-1 px-2 border-retro-green border-[0.5px] bg-green-400 text-white flex justify-between items-center box-border"
                  key={"new-ticket"}
                  onClick={() => {
                    playClickSound();
                    handleOpenTicketModal(null, "Create", column._id);
                  }}
                >
                  <div>Create new Todo</div>
                  <div className="text-2xl">+</div>
                </div>
              </div>
            );
          })}
          <div className="border-[0.5px] border-dashed border-retro-green shadow-90s bg-white p-6 w-64 flex flex-col items-center justify-center">
            {isAddingColumn ? (
              <>
                <input
                  autoFocus
                  className="w-full py-1 px-2 shadow-90s-input border-[0.5px] border-retro-green retro-green"
                  placeholder="Column name.."
                  value={newColumnName}
                  onChange={(ev) => setNewColumnName(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") submitNewColumn();
                    if (ev.key === "Escape") {
                      setNewColumnName("");
                      setIsAddingColumn(false);
                    }
                  }}
                  onBlur={submitNewColumn}
                />
              </>
            ) : (
              <div
                className="retro-green text-sm font-black cursor-pointer flex items-center gap-2"
                onClick={() => {
                  playClickSound();
                  setIsAddingColumn(true);
                }}
              >
                <span className="text-2xl">+</span> Add Column
              </div>
            )}
          </div>
        </div>
      </div>
      {dragGhost && (
        <div
          style={{
            position: "fixed",
            left: dragGhost.x,
            top: dragGhost.y,
            width: dragGhost.width,
            transform: `rotate(${dragGhost.rotation}deg)`,
            zIndex: 200,
            pointerEvents: "none",
          }}
          className={`border-[0.5px] border-retro-green retro-green p-2 shadow-90s-btn-hover bg-white opacity-90`}
        >
          {(() => {
            const ghostMedia = (dragGhost.todo.attachments || []).filter(
              (attachment) => attachment.type === "image" || attachment.type === "video"
            );
            if (ghostMedia.length === 0) return null;
            return ghostMedia[0].type === "video" ? (
              <video
                src={BACKEND_ADDRESS + ghostMedia[0].url}
                muted
                className="w-full max-h-32 object-cover border-[0.5px] border-retro-green mb-2"
              />
            ) : (
              <img
                src={BACKEND_ADDRESS + ghostMedia[0].url}
                alt={dragGhost.todo.title}
                className="w-full max-h-32 object-cover border-[0.5px] border-retro-green mb-2"
              />
            );
          })()}
          <div className="mb-2 font-black line-clamp-4">{dragGhost.todo.title}</div>
          <div className="text-xs line-clamp-6">{dragGhost.todo.description}</div>
        </div>
      )}
      {lightboxAttachment && (
        <div
          style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          className="flex w-[100vw] h-[100vh] fixed top-0 left-0 justify-center items-center z-[100]"
          onClick={() => setLightboxAttachment(null)}
        >
          {lightboxAttachment.type === "video" ? (
            <video
              src={BACKEND_ADDRESS + lightboxAttachment.url}
              controls
              autoPlay
              className="max-h-[85vh] max-w-[85vw] object-contain"
              onClick={(ev) => ev.stopPropagation()}
            />
          ) : (
            <img
              src={BACKEND_ADDRESS + lightboxAttachment.url}
              alt="Full size attachment"
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
          )}
        </div>
      )}
    </section>
  );
};

export default Home;
