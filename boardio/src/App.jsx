import React, { Suspense, useEffect, useState } from "react";
import "./App.css";
import Modal from "./components/modal";
import Toast from "./components/toast";
import { BACKEND_ADDRESS } from "./utils/constants";
import { playClickSound } from "./utils/utility";

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
  });
  function getTickets() {
    fetch(BACKEND_ADDRESS + "/get-tickets")
      .then((x) => x.json())
      .then((ticketsList) => {
        debugger;
        setTickets(ticketsList);
      });
  }

  function showToast(message) {
    setIsToastOpen(false);
    setToastMessage(message);
    setIsToastOpen(true);
  }

  function handleOpenTicketModal(key, type) {
    setTicketType(type);
    if (type == "Update") {
      const selectedTicket = tickets.find((ticket) => ticket._id === key);
      setModalData({
        _id: selectedTicket._id,
        title: selectedTicket.title,
        description: selectedTicket.description,
      });
    } else {
      setModalData({
        _id: -1,
        title: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  }

  function handleOnExit() {
    setIsToastOpen(false);
  }

  useEffect(getTickets, []);

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
          <LazyCreateBoard router={router} />
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
