import React, { useEffect, useState } from "react";
import { ADDRESS, playClickSound } from "../../utils/constants";
import "./index.css";

const Modal = ({
  handleOnClose,
  modalData,
  ticketType,
  isOpen,
  handleRefetch,
  showToast
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setTitle(modalData.title);
    setDescription(modalData.description);
  }, [modalData]);

  if (isOpen) {
    return (
      <div
        style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
        id="modal-bg"
        className="flex w-[100vw] h-[100vh] absolute justify-center items-center z-50"
        onClick={(e) => {
          if (e.target.id === "modal-bg") {
            setTitle("");
            setDescription("");
            handleOnClose();
          }
        }}
      >
        <div className="flex bg-white shadow-90s border-retro-green border-[0.5px]">
          <div className="p-4 retro-green flex flex-col">
            <input
              type="text"
              className="text-3xl font-black border-[0.5px] border-retro-green shadow-90s-input my-2 mx-2 p-2"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              placeholder="Ticket title over here! etc.."
            />
            <textarea
              rows={6}
              cols={60}
              placeholder="Enter detailed ticket description over here.."
              className="p-2 border-[0.5px] text-xl border-retro-green shadow-90s-input my-2 mx-2"
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              value={description}
            ></textarea>
            <div className="flex ml-auto">
              {ticketType == "Update" && (
                <div className="m-2 w-fit shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3 bg-red-400 text-white" onClick={() => {
                  if (modalData._id) {
                    fetch(ADDRESS + "/delete-ticket", {
                      method: "DELETE",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ ticketId: modalData._id }),
                    }).then(() => {
                      handleRefetch();
                      setTitle("");
                      setDescription("");
                      handleOnClose();
                      showToast('Ticket Deleted Successfully!');
                    });
                  }
                }}>
                  Delete Ticket
                </div>
              )}
              <div
                className={`m-2 w-fit shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3 ${((modalData.title === title && modalData.description === description) || (title.trim() == '') || (description.trim() == '')) ? 'bg-gray-400 text-black' : 'bg-green-400 text-white' } `}
                onClick={() => {
                  if (!((modalData.title === title && modalData.description === description) || (title.trim() == '') || (description.trim() == ''))) {
                    if (ticketType == 'Create') {
                      fetch(ADDRESS + "/create-ticket", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          title,
                          description,
                        }),
                      }).then(() => {
                        handleRefetch();
                        setTitle("");
                        setDescription("");
                        handleOnClose();
                        showToast('Ticket created Successfully!');
                      });
                    } else if (ticketType == 'Update') {
                      fetch(ADDRESS + "/update-ticket", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          ticketId: modalData._id,
                          title,
                          description,
                        }),
                      }).then(() => {
                        handleRefetch();
                        setTitle("");
                        setDescription("");
                        handleOnClose();
                        showToast('Ticket updated Successfully!');
                      });
                    }
                  }
                }}
              >
                {ticketType} Ticket
              </div>
            </div>
          </div>
          <div className="pr-4 pt-6 retro-green shadow-90s-input">
            <div className="shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3">
              Power-ups
            </div>
            <div className="shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3">
              Actions
            </div>
            <div className="shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3">
              Webhooks
            </div>
            <div className="shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3">
              Events
            </div>
            <div className="shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3">
              Custom
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default Modal;
