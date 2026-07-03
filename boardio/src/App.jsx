import React, { Suspense, useEffect, useState } from "react";
import "./App.css";
import Modal from "./components/modal";
import Toast from "./components/toast";
import { BACKEND_ADDRESS } from "./utils/constants";
import { playClickSound } from "./utils/utility";
import { authFetch, getToken } from "./utils/auth";

// Lazy loading components
const LazyHome = React.lazy(() => import("./pages/home"));
const LazyCreateBoard = React.lazy(() => import("./pages/create-board"));
const LazyLogin = React.lazy(() => import("./pages/login"));

function App() {
  const [tickets, setTickets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastMesage, setToastMessage] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [modalData, setModalData] = useState({
    _id: -1,
    title: "",
    description: "",
    attachments: [],
    stamps: [],
    createdAt: null,
    columnId: -1,
  });
  const [boardName, setBoardName] = useState("");
  const [columns, setColumns] = useState([]);
  const [boards, setBoards] = useState([]);

  function getTickets() {
    authFetch(BACKEND_ADDRESS + "/get-tickets")
      .then((x) => x.json())
      .then((ticketsList) => {
        setTickets(ticketsList);
      });
  }

  function getBoard() {
    authFetch(BACKEND_ADDRESS + "/get-board")
      .then((x) => x.json())
      .then((board) => setBoardName(board.name));
  }

  function getColumns() {
    authFetch(BACKEND_ADDRESS + "/get-columns")
      .then((x) => x.json())
      .then((columnsList) => setColumns(columnsList));
  }

  function handleUpdateBoardName(name) {
    return authFetch(BACKEND_ADDRESS + "/update-board-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(() => {
      setBoardName(name);
      showToast("Board name updated!");
    });
  }

  function getBoards() {
    return authFetch(BACKEND_ADDRESS + "/get-boards")
      .then((x) => x.json())
      .then((boardsList) => setBoards(boardsList));
  }

  function handleCreateBoard(name) {
    return authFetch(BACKEND_ADDRESS + "/create-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((x) => x.json())
      .then((createdBoard) => {
        setBoardName(createdBoard.name);
        return getBoards();
      });
  }

  function handleSelectBoard(boardId) {
    return authFetch(BACKEND_ADDRESS + "/select-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId }),
    }).then(() => {
      const selected = boards.find((b) => b._id === boardId);
      if (selected) setBoardName(selected.name);
    });
  }

  function handleCreateColumn(name) {
    return authFetch(BACKEND_ADDRESS + "/create-column", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(() => {
      getColumns();
      showToast("Column created!");
    });
  }

  function handleDeleteColumn(columnId) {
    return authFetch(BACKEND_ADDRESS + "/delete-column", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId }),
    }).then(() => {
      getColumns();
      getTickets();
      showToast("Column deleted!");
    });
  }

  function handleReorderColumns(columnIds) {
    setColumns((prevColumns) =>
      columnIds
        .map((id) => prevColumns.find((column) => column._id === id))
        .filter(Boolean)
    );
    return authFetch(BACKEND_ADDRESS + "/reorder-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnIds }),
    });
  }

  function showToast(message) {
    setIsToastOpen(false);
    setToastMessage(message);
    setIsToastOpen(true);
  }

  function handleOpenTicketModal(key, type, columnId) {
    setTicketType(type);
    if (type == "Update") {
      const selectedTicket = tickets.find((ticket) => ticket._id === key);
      setModalData({
        _id: selectedTicket._id,
        title: selectedTicket.title,
        description: selectedTicket.description,
        attachments: selectedTicket.attachments || [],
        stamps: selectedTicket.stamps || [],
        createdAt: selectedTicket.createdAt,
        columnId: selectedTicket.columnId,
      });
    } else {
      setModalData({
        _id: -1,
        title: "",
        description: "",
        attachments: [],
        stamps: [],
        createdAt: null,
        columnId,
      });
    }
    setIsModalOpen(true);
  }

  function handleOnExit() {
    setIsToastOpen(false);
  }

  useEffect(() => {
    if (!getToken() && window.location.pathname !== "/login") {
      window.location.pathname = "/login";
      return;
    }
    if (window.location.pathname === "/login") return;
    getTickets();
    getBoard();
    getColumns();
    getBoards();
  }, []);

  const router = {
    push: (route) => {
      let intervalId = setTimeout(() => {
        window.location.pathname = route;
        clearInterval(intervalId);
      }, 1000);
    },
  };

  let Screen = <></>;
  let Loader = <div className="w-[100vw] h-[100vh] bg-[#D986D9]"></div>;
  switch (window.location.pathname) {
    case "/login":
      Screen = (
        <Suspense fallback={Loader}>
          <LazyLogin router={router} />
        </Suspense>
      );
      break;
    case "/create-board":
      Screen = (
        <Suspense fallback={Loader}>
          <LazyCreateBoard
            router={router}
            boards={boards}
            handleCreateBoard={handleCreateBoard}
            handleSelectBoard={handleSelectBoard}
          />
        </Suspense>
      );
      break;
    case "/home":
      Screen = (
        <Suspense fallback={Loader}>
          <LazyHome
            showToast={showToast}
            router={router}
            handleOpenTicketModal={handleOpenTicketModal}
            todos={tickets}
            boardName={boardName}
            columns={columns}
            handleUpdateBoardName={handleUpdateBoardName}
            handleCreateColumn={handleCreateColumn}
            handleDeleteColumn={handleDeleteColumn}
            handleReorderColumns={handleReorderColumns}
          />
        </Suspense>
      );
      break;
    default:
      Screen = (
        <Suspense fallback={Loader}>
          <LazyLogin router={router} />
        </Suspense>
      );
      break;
  }

  return (
    <>
      {isModalOpen && (
        <Modal
          showToast={showToast}
          modalData={modalData}
          ticketType={ticketType}
          isOpen={isModalOpen}
          handleRefetch={getTickets}
          handleOnClose={() => {
            setIsModalOpen(false);
            setModalData({
              _id: -1,
              title: "",
              description: "",
            });
            playClickSound();
          }}
        />
      )}
      {isToastOpen && (
        <Toast
          message={toastMesage}
          isOpen={isToastOpen}
          handleOnExit={handleOnExit}
          delay={2000}
        />
      )}
      {Screen}
    </>
  );
}

export default App;
