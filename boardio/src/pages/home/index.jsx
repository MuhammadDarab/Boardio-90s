import { io } from "socket.io-client";
import React, { useEffect, useState } from "react";
import SocketUser from "../../utils/connections";
import { playClickSound } from "../../utils/constants";
import "./index.css";
import { v4 } from 'uuid';

const Home = ({ todos = [], handleOpenTicketModal, showToast }) => {
  const [roomUsers, setRoomUsers] = useState([]);

  function createNameTag({ id, color, name, nameTagRef }) {
    return (
      <div className="absolute z-50" ref={nameTagRef}>
        <svg className="shaodow-90s-btn" width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.503 5.97C16.707 6.459 16.615 8.194 15.366 8.553L9.06097 10.366L6.18097 16.261C5.60997 17.429 3.88497 17.218 3.61197 15.947L0.676975 2.257C0.624526 2.01366 0.639415 1.76063 0.72004 1.52513C0.800665 1.28963 0.943974 1.08056 1.13455 0.920429C1.32513 0.760295 1.55576 0.655152 1.80163 0.616313C2.04751 0.577473 2.29932 0.606405 2.52997 0.699998L15.503 5.97Z" fill={color} stroke="#126262"/>
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
    if ((window.location.pathname == "/home")) {
      const socket = io("http://192.168.0.112:8001");
      const currentId = v4();

      // Tell the server that you have joined!
      const maleNames = [
        "Muhammad",
        "Ali",
        "Omar",
        "Hassan",
        "Ahmed",
        "Yusuf",
        "Abdullah",
        "Ibrahim",
        "Mustafa",
        "Abdul",
        "Hamza",
        "Khalid",
        "Zaid",
        "Tariq",
        "Amir",
        "Bilal",
        "Nasir",
        "Rashid",
        "Sami",
        "Zakariya"
      ];
      const colors = ['red', 'orange', 'green', 'blue', 'pink', 'purple', 'slate', 'aqua', 'lime'];
      socket.emit("user:join", {
        color: colors[Math.trunc(Math.random() * colors.length)],
        name: maleNames[Math.trunc(Math.random() * maleNames.length)],
        id: currentId,
      });

      // Changes the positions of other user's nametag.
      socket.on("user:mouse-move", (id, mousePosition) => {
        setRoomUsers((prevUsers) =>
          prevUsers.map((user) => {
            if (user.id === id) user.moveNameTag(mousePosition);
            return user;
          })
        );
      });

      // Runs when you join to tell you about others that are in the room!!
      socket.on("user:introduce-others", ({ connectedUsers }) => {
        connectedUsers.map(({ id, color, name}) => {
          const socketUser = new SocketUser({ id, color, name, showToast });
          socketUser.nameTagRef = React.createRef();
          setRoomUsers((prevUsers) => [...prevUsers, socketUser]);
        })
      });

      // Runs when a new user joins.
      socket.on("user:join", ({ id, color, name }) => {
        const socketUser = new SocketUser({ id, color, name, showToast });
        socketUser.nameTagRef = React.createRef();
        setRoomUsers((prevUsers) => [...prevUsers, socketUser]);
      });

      // When user leaves the room!
      socket.on("user:left", ({ id }) => setRoomUsers((prevUsers) => prevUsers.filter((user) => {
        if (user.id !== id) return true;
        user.removeNameTag();
        return false;
      })));

      // Handle mouse move.
      window.addEventListener("mousemove", ({ clientX, clientY }) => {
        socket.emit("user:mouse-move", currentId, { clientX, clientY });
      });

      // Emit leaving event before closing.
      window.addEventListener("beforeunload", () => socket.emit("user:left", { id: currentId }));

      return () => {
        socket.emit("user:left", { id: currentId })
        socket.disconnect();
      };
    }
  }, []);

  return (
    <section>
      {roomUsers.map((user) => createNameTag(user))}
      <div className="border-[0.5px] border-retro-green shadow-90s absolute bg-white my-14 ml-12 p-6">
        <div className="text-3xl font-black retro-green">Todos</div>
        <br />
        <hr />
        {todos.map((todo) => (
          <div
            key={todo._id}
            className="border-[0.5px] border-retro-green retro-green p-2 shadow-90s-btn w-64 mt-4 max-w-64"
            onClick={() => {
              playClickSound();
              handleOpenTicketModal(todo._id, "Update");
            }}
          >
            <div className="mb-2 font-black line-clamp-4">{todo.title}</div>
            <div className="text-xs line-clamp-6">{todo.description}</div>
          </div>
        ))}
        {todos.length == 0 && (
          <div className="retro-green text-xs max-w-64">
            List down your important tasks, i.e. Go fishing, Repair Hamza's
            typewriter In Shaa Allah etc..
            <br />
            <br />
            <br />
            ADD MASONARY LAYOUT LIKE COLUMNS... and move them like blender
            nodes.
          </div>
        )}
        <div
          className="w-64 max-w-64 shadow-90s-btn mt-4 py-1 px-2 border-retro-green border-[0.5px] bg-gray-400 text-white flex justify-between items-center"
          key={"new-ticket"}
          onClick={(e) => {
            playClickSound();
            handleOpenTicketModal(null, "Create");
          }}
        >
          <div>Create new Todo</div>
          <div className="text-2xl">+</div>
        </div>
      </div>
    </section>
  );
};

export default Home;
